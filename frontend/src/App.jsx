import { useState, useEffect } from 'react';
import './index.css';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, orderBy, query, deleteDoc, doc, updateDoc } from 'firebase/firestore';


let sharedAudioCtx = null;

const initAudio = () => {
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  // Resume state if suspended (browser autoplay policy requires user interaction)
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
};

const playBeep = () => {
  return new Promise((resolve) => {
    if (!sharedAudioCtx) {
      resolve();
      return;
    }
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, sharedAudioCtx.currentTime);
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    
    osc.start();
    setTimeout(() => {
      osc.stop();
      resolve();
    }, 300); // 0.3 seconds beep
  });
};

function App() {
  const [backendMessage, setBackendMessage] = useState('');
  const [formData, setFormData] = useState({ name: '', instruction: '', startDate: '', totalPills: '' });
  const [medications, setMedications] = useState([]);
  const [activeReminder, setActiveReminder] = useState(null);

  useEffect(() => {
    // Fetch data from Node.js backend to verify it's up
    fetch('http://localhost:3001/')
      .then((res) => res.json())
      .then((data) => setBackendMessage(data.message))
      .catch(() => setBackendMessage('Backend offline'));

    // Listen to Firebase "medications" collection in real-time
    const q = query(collection(db, 'medications'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const medsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      // We can sort them here or use orderBy in the query if we had timestamps
      setMedications(medsData);
    }, (err) => {
      console.error("Failed to fetch medications:", err);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'medications', id));
    } catch (err) {
      console.error("Error deleting:", err);
      alert("Error deleting medication");
    }
  };

  const parseSchedule = (instruction) => {
    const text = instruction.toLowerCase();
    if (text.includes('every 8 hours')) {
      return ['08:00', '16:00', '00:00'];
    }
    if (text.includes('twice a day') || text.includes('twice daily')) {
      return ['08:00', '20:00'];
    }
    if (text.includes('once a day') || text.includes('once daily') || text.includes('daily')) {
      return ['08:00'];
    }
    return [];
  };

  const handleMarkTaken = async (id, time, med) => {
    const today = new Date().toISOString().split('T')[0];
    const currentTaken = med.taken || {};
    const currentPillsTaken = med.pillsTaken || 0;
    
    const newTaken = { ...currentTaken };
    if (!newTaken[today]) {
      newTaken[today] = [];
    }

    // Only update if not already taken at this time
    if (!newTaken[today].includes(time)) {
      newTaken[today].push(time);
      
      try {
        await updateDoc(doc(db, 'medications', id), {
          taken: newTaken,
          pillsTaken: currentPillsTaken + 1
        });
      } catch (err) {
        console.error("Error updating taken status:", err);
        alert("Failed to mark as taken.");
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    initAudio(); // Initialize audio context during user gesture to comply with browser policies
    if (!formData.name || !formData.instruction) return;

    const parsedTimes = parseSchedule(formData.instruction);

    try {
      const finalTimes = parsedTimes.length > 0 ? parsedTimes : ['Anytime'];

      const currentName = formData.name;
      const docRef = await addDoc(collection(db, 'medications'), {
        name: formData.name,
        instruction: formData.instruction,
        startDate: formData.startDate,
        totalPills: parseInt(formData.totalPills) || 0,
        pillsTaken: 0,
        scheduledTimes: finalTimes,
        taken: {},
        createdAt: new Date().toISOString()
      });
      
      // Trigger alert for testing within the next 1 minute
      setTimeout(async () => {
        await playBeep();
        setActiveReminder({ id: docRef.id, time: finalTimes[0], name: currentName });
      }, 60000);

      setFormData({ name: '', instruction: '', startDate: '', totalPills: '' });
    } catch (err) {
      console.error("Error submitting:", err);
      alert('Error submitting form');
    }
  };

  return (
    <div className="app-container">
      <h1>PillAlert</h1>
      
      <div className="status-bubble">
        <span style={{ marginRight: '6px', fontSize: '1.2em' }}>⚡</span>
        {backendMessage ? backendMessage : 'Waiting for backend...'}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Medication Name</label>
          <input 
            type="text" 
            name="name" 
            placeholder="e.g. Lisinopril 20mg"
            value={formData.name} 
            onChange={handleChange} 
            required
          />
        </div>

        <div className="form-group">
          <label>Instructions</label>
          <textarea 
            name="instruction" 
            placeholder="e.g. Take one tablet by mouth daily in the morning"
            value={formData.instruction} 
            onChange={handleChange} 
            rows={3}
            required
          />
        </div>

        <div className="form-group-row">
          <div className="form-group">
            <label>Start Date</label>
            <input 
              type="date" 
              name="startDate" 
              value={formData.startDate} 
              onChange={handleChange} 
              required
            />
          </div>

          <div className="form-group">
            <label>Total Pills</label>
            <input 
              type="number" 
              name="totalPills" 
              placeholder="e.g. 30"
              value={formData.totalPills} 
              onChange={handleChange} 
              required
            />
          </div>
        </div>

        <button type="submit">Add Medication</button>
      </form>

      <div className="medications-list">
        <h3>Your Medications</h3>
        {medications.length === 0 ? (
          <p style={{ color: 'var(--text)', fontSize: '0.9rem' }}>No medications added yet. Add one above to get started.</p>
        ) : (
          medications.map((med) => {
            const remaining = (med.totalPills || 0) - (med.pillsTaken || 0);
            return (
              <div key={med.id} className="med-card">
              <div className="med-header">
                <span className="med-name">{med.name}</span>
                <button 
                  onClick={() => handleDelete(med.id)} 
                  className="delete-btn" 
                  aria-label="Delete"
                  title="Delete medication"
                >
                  ✕
                </button>
              </div>
              <div className="med-instruction">{med.instruction}</div>
              
              <div className="med-progress-container">
                <div className="med-progress-info">
                  <span>Pills: <strong>{med.pillsTaken || 0}</strong> / {med.totalPills || 0}</span>
                  <span className={`med-remaining ${remaining < 5 ? 'low-stock' : ''}`}>
                    {remaining < 5 ? `Low stock: ${remaining} left` : `Remaining: ${remaining} pills`}
                  </span>
                </div>
                {remaining < 5 && remaining > 0 && (
                  <div className="low-stock-alert">
                    ⚠️ Low medication: only {remaining} pills left
                  </div>
                )}
                {remaining === 0 && med.totalPills > 0 && (
                  <div className="out-of-stock-alert">
                    🚫 Out of medication!
                  </div>
                )}
                <div className="med-meta">
                  <span className="med-start-date">Started: {med.startDate || 'N/A'}</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${Math.min(100, ((med.pillsTaken || 0) / (med.totalPills || 1)) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
              {med.scheduledTimes && med.scheduledTimes.length > 0 && (
                <div className="med-schedule-container" style={{ flexWrap: 'wrap', alignItems: 'flex-start', flexDirection: 'column' }}>
                  <span className="schedule-label" style={{ marginBottom: '4px' }}>Schedule ⏱:</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {med.scheduledTimes.map(time => {
                      const today = new Date().toISOString().split('T')[0];
                      const isTaken = med.taken && med.taken[today] && med.taken[today].includes(time);
                      return (
                        <button 
                          key={time} 
                          title="Click to mark as taken"
                          className={`take-btn ${isTaken ? 'taken' : ''}`}
                          onClick={() => handleMarkTaken(med.id, time, med)}
                          disabled={isTaken}
                        >
                          {isTaken ? `✔ ${time} Taken` : `◯ ${time}`}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>

      {activeReminder && (
        <div className="reminder-modal-overlay">
          <div className="reminder-modal">
            <h3>Reminder!</h3>
            <p>It's time to take: <strong>{activeReminder.name}</strong></p>
            <div className="reminder-modal-actions">
              <button onClick={() => {
                const med = medications.find(m => m.id === activeReminder.id);
                if (med) {
                  handleMarkTaken(activeReminder.id, activeReminder.time, med);
                }
                setActiveReminder(null);
              }}>✔ Mark as taken</button>
              <button className="cancel-btn" onClick={() => setActiveReminder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

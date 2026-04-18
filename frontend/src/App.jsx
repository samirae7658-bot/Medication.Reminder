import { useState, useEffect } from 'react';
import './index.css';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore';

function App() {
  const [backendMessage, setBackendMessage] = useState('');
  const [formData, setFormData] = useState({ name: '', instruction: '' });
  const [medications, setMedications] = useState([]);

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.instruction) return;

    const parsedTimes = parseSchedule(formData.instruction);

    try {
      await addDoc(collection(db, 'medications'), {
        name: formData.name,
        instruction: formData.instruction,
        scheduledTimes: parsedTimes,
        createdAt: new Date().toISOString()
      });
      setFormData({ name: '', instruction: '' });
    } catch (err) {
      console.error("Error submitting:", err);
      alert('Error submitting form');
    }
  };

  return (
    <div className="app-container">
      <h1>Reminders</h1>
      
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

        <button type="submit">Add Medication</button>
      </form>

      <div className="medications-list">
        <h3>Your Medications</h3>
        {medications.length === 0 ? (
          <p style={{ color: 'var(--text)', fontSize: '0.9rem' }}>No medications added yet. Add one above to get started.</p>
        ) : (
          medications.map((med) => (
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
              {med.scheduledTimes && med.scheduledTimes.length > 0 && (
                <div className="med-schedule-container">
                  <span className="schedule-label">Schedule:</span>
                  <span className="med-time-badge">
                    ⏱ {med.scheduledTimes.join(', ')}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;

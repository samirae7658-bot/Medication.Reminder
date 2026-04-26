import { useState, useEffect } from 'react';
import './index.css';
import { db } from './firebase';
import { onSnapshot, collection, addDoc, query, deleteDoc, doc, updateDoc } from 'firebase/firestore';


import { Button, TextField, Container, Card, CardContent, Typography, Box } from "@mui/material";
import AddMedicationForm from './components/AddMedicationForm';
import MedicationCard from './components/MedicationCard';
import MedicationCalendar from './components/MedicationCalendar';
let sharedAudioCtx = null;
import ReminderModal from './components/ReminderModal';




const initAudio = () => {
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
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
  const [formData, setFormData] = useState({ name: '', instruction: '', startDate: '', totalPills: '' });
  const [medications, setMedications] = useState([]);
  const [activeReminder, setActiveReminder] = useState(null);
  const [missedDoses, setMissedDoses] = useState({}); // { medId: [times] }
  const [notifiedMissed, setNotifiedMissed] = useState(new Set()); 



  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    // Listen to Firebase "medications" collection in real-time
    const q = query(collection(db, 'medications'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const medsData = snapshot.docs.map(document => ({
        ...document.data(),
        id: document.id
      }));
      setMedications(medsData);
    }, (err) => {
      console.error("Failed to fetch medications:", err);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {

    // Background check every minute for missed medications
    const interval = setInterval(() => {
      const now = new Date();
      const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = now.toISOString().split('T')[0];

      medications.forEach(med => {
        med.scheduledTimes?.forEach(time => {
          if (time === 'Anytime') return;
          
          const isTaken = med.taken?.[today]?.includes(time);
          if (!isTaken && currentHHmm > time) {
            // It's missed
            const doseId = `${med.id}-${today}-${time}`;
            if (!notifiedMissed.has(doseId)) {
              playBeep();
              
              // Mobile/Browser Notification
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("PillAlert: Missed Medication", {
                  body: `You missed your dose of ${med.name} scheduled for ${time}.`,
                  icon: "/favicon.ico"
                });
              }

              console.warn(`Missed medication: ${med.name} at ${time}`);
              setNotifiedMissed(prev => new Set(prev).add(doseId));
            }

          }
        });
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [medications, notifiedMissed]);


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
    if (text.includes('every 8 hours')) return ['08:00', '16:00', '00:00'];
    if (text.includes('twice a day') || text.includes('twice daily')) return ['08:00', '20:00'];
    if (text.includes('once a day') || text.includes('once daily') || text.includes('daily')) return ['08:00'];
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
    initAudio(); 
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
    <>
      <Container maxWidth="md" sx={{ mt: 5 }}>
        <Card sx={{ borderRadius: 4, boxShadow: 6 }}>
          <CardContent>
            <div className="app-container">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 0 }}>
                        PillAlert
                    </Typography>
                </Box>

                       
              <AddMedicationForm
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
              />

              <MedicationCalendar medications={medications} />

              <div className="medications-list" style={{ marginTop: '32px' }}>
                <Typography variant="h5" component="h3" sx={{ mb: 2, fontWeight: 'bold' }}>Today's Schedule</Typography>
                {medications.length === 0 ? (
                  <Typography align="center" color="text.secondary" sx={{ py: 4 }}>No medications added yet. Start by adding one above!</Typography>
                ) : (
                  medications.map(med => (
                    <MedicationCard
                      key={med.id}
                      med={med}
                      handleDelete={handleDelete}
                      handleMarkTaken={handleMarkTaken}
                    />
                  ))
                )}
              </div>

            </div>
          </CardContent>
        </Card>
      </Container>
      <ReminderModal 
        activeReminder={activeReminder} 
        setActiveReminder={setActiveReminder} 
        handleMarkTaken={handleMarkTaken} 
        medications={medications} 
      />
    </>
  );
}

export default App;

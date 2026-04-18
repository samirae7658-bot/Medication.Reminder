const express = require('express');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');

const app = express();
const port = 3001; // Using 3001 to avoid conflicting with typical frontend ports

app.use(cors());
app.use(express.json()); // For handling form data if needed in the future

// TODO: Replace with your actual Firebase Project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const isFakeConfig = firebaseConfig.apiKey === "YOUR_API_KEY";
let db = null;

if (isFakeConfig) {
  console.warn("\n=======================================================");
  console.warn("⚠️ WARNING: Firebase config is missing!");
  console.warn("Falling back to IN-MEMORY storage. Data will reset on exit.");
  console.warn("Please add your Firebase keys to backend/index.js.");
  console.warn("=======================================================\n");
} else {
  const firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);
}

// In-memory fallback dataset
const memoryMedications = [];

// Simple parser function to derive scheduled times from natural language instruction
function parseInstruction(instruction) {
  const text = instruction.toLowerCase();
  if (text.includes('twice a day')) return ["08:00", "20:00"];
  if (text.includes('every 8 hours')) return ["08:00", "16:00", "00:00"];
  if (text.includes('once a day') || text.includes('daily')) return ["08:00"];
  return []; // Default if unparseable
}

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Node.js + Express Backend!' });
});

// POST to add a new medication to Firestore (or fallback)
app.post('/medications', async (req, res) => {
  const { name, instruction } = req.body;
  if (!name || !instruction) {
    return res.status(400).json({ error: 'Name and instruction are required' });
  }

  const scheduledTimes = parseInstruction(instruction);
  const newMedication = { name, instruction, scheduledTimes, createdAt: Date.now() };
  
  if (isFakeConfig) {
    const memoryId = `mem_${Date.now()}`;
    memoryMedications.push({ id: memoryId, ...newMedication });
    return res.status(201).json({ id: memoryId, ...newMedication });
  }

  try {
    const docRef = await addDoc(collection(db, "medications"), newMedication);
    res.status(201).json({ id: docRef.id, ...newMedication });
  } catch (error) {
    console.error("Error adding document: ", error);
    res.status(500).json({ error: "Failed to save to Firestore" });
  }
});

// GET to retrieve all medications from Firestore (or fallback)
app.get('/medications', async (req, res) => {
  if (isFakeConfig) {
    return res.json(memoryMedications);
  }

  try {
    const querySnapshot = await getDocs(collection(db, "medications"));
    const medicationsList = [];
    querySnapshot.forEach((doc) => {
      medicationsList.push({ id: doc.id, ...doc.data() });
    });
    res.json(medicationsList);
  } catch (error) {
    console.error("Error fetching documents: ", error);
    res.status(500).json({ error: "Failed to fetch from Firestore" });
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});


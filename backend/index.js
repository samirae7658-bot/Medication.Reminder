const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
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

const USERS_FILE = path.join(__dirname, 'users.json');

function getUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Node.js + Express Backend!' });
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const users = getUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'Username already taken' });
  }
  const newUser = { id: `usr_${Date.now()}`, username, password };
  users.push(newUser);
  saveUsers(users);
  res.status(201).json({ id: newUser.id, username: newUser.username });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (user) {
    res.json({ id: user.id, username: user.username });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
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

// PUT to update a medication
app.put('/medications/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (isFakeConfig) {
    const index = memoryMedications.findIndex(m => m.id === id);
    if (index !== -1) {
      memoryMedications[index] = { ...memoryMedications[index], ...updates };
      return res.json(memoryMedications[index]);
    }
    return res.status(404).json({ error: "Not found" });
  }
  // Simplified firebase fallback (assuming updateDoc is imported)
  try {
    const { updateDoc, doc } = require('firebase/firestore');
    await updateDoc(doc(db, 'medications', id), updates);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Failed to update" });
  }
});

// DELETE a medication
app.delete('/medications/:id', async (req, res) => {
  const { id } = req.params;
  if (isFakeConfig) {
    const index = memoryMedications.findIndex(m => m.id === id);
    if (index !== -1) {
      memoryMedications.splice(index, 1);
    }
    return res.json({ success: true });
  }
  try {
    const { deleteDoc, doc } = require('firebase/firestore');
    await deleteDoc(doc(db, 'medications', id));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});


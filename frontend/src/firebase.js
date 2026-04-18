import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBWsUNX69khT0ETkLjmdqgZUoNZNLB8c-o",
  authDomain: "reminder-77208.firebaseapp.com",
  projectId: "reminder-77208",
  storageBucket: "reminder-77208.firebasestorage.app",
  messagingSenderId: "517068769110",
  appId: "1:517068769110:web:ce5e132a83bdde957cf8f7",
  measurementId: "G-E7KJ9BT90E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { app, db };

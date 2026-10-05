import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCi3XW-9Metb9h6eRjVNhRFDDHsuaTTzQM",
  authDomain: "model-motion.firebaseapp.com",
  projectId: "model-motion",
  storageBucket: "model-motion.firebasestorage.app",
  messagingSenderId: "843468130335",
  appId: "1:843468130335:web:db1c6dcdbd95b87b052d2a",
};

export const firebaseConfigured = true;
export const firebaseConfigurationError: string | null = null;
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);

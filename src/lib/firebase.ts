import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries(firebaseConfig).filter(([, value]) => !value).map(([key]) => key);
export const firebaseConfigured = missing.length === 0;
export const firebaseConfigurationError = firebaseConfigured ? null : `Missing Firebase configuration: ${missing.join(", ")}`;

const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
export const storage = app ? getStorage(app) : null;
export const db = app ? getFirestore(app) : null;

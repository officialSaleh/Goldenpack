import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// GoldPack Pro Production Credentials
const firebaseConfig = {
  apiKey: "AIzaSyDQOtJ9d9_LZIF6jCOeNZUd7BOjNG0sRz8",
  authDomain: "goldpack-5cf05.firebaseapp.com",
  projectId: "goldpack-5cf05",
  storageBucket: "goldpack-5cf05.firebasestorage.app",
  messagingSenderId: "240102563988",
  appId: "1:240102563988:web:df2e021eedec63a0fc1481",
  measurementId: "G-QCPNF6VC17"
};

const app = initializeApp(firebaseConfig);

// Initialize and export services
export const auth = getAuth(app);
export const db_firestore = getFirestore(app);

// Analytics is only supported in browser environments
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
/**
 * Firebase Configuration & Initialization
 * MedWard Pro v9.0.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDuug0BTqO6DsSuyS2RkVcrcXCIB7E0oB4",
  authDomain: "medward-pro.firebaseapp.com",
  projectId: "medward-pro",
  storageBucket: "medward-pro.firebasestorage.app",
  messagingSenderId: "1033128540980",
  appId: "1:1033128540980:web:07bba197713232b0b54361",
  measurementId: "G-LQYE3F4T5C",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);

// Connect to emulators in development
const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

if (useEmulators) {
  const host = import.meta.env.VITE_EMULATOR_HOST || 'localhost';
  
  try {
    connectAuthEmulator(auth, `http://${host}:${import.meta.env.VITE_AUTH_EMULATOR_PORT || 9099}`, {
      disableWarnings: true,
    });
    
    connectFirestoreEmulator(db, host, parseInt(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || '8080'));
    
    connectFunctionsEmulator(functions, host, parseInt(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || '5001'));
    
    connectStorageEmulator(storage, host, parseInt(import.meta.env.VITE_STORAGE_EMULATOR_PORT || '9199'));
    
    console.log('🔧 Connected to Firebase Emulators');
  } catch (error) {
    console.warn('Failed to connect to emulators:', error);
  }
}

// Export initialized services
export { app, auth, db, functions, storage };

// Export config for reference
export const config = {
  projectId: firebaseConfig.projectId,
  useEmulators,
};

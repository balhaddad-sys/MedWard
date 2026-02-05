/**
 * Firebase Configuration & Initialization
 * MedWard Pro v9.0.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase config is present
export const configMissing = !firebaseConfig.apiKey || !firebaseConfig.projectId;

let app = null;
let auth = null;
let db = null;
let functions = null;
let storage = null;

if (!configMissing) {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);

  // Initialize services
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
  storage = getStorage(app);
} else {
  console.error(
    'Firebase config missing. Create a .env file with VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc.'
  );
}

// Connect to emulators in development
const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

if (useEmulators && !configMissing) {
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

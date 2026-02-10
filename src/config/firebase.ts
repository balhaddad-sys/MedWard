import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore'
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions'

interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage
let functions: Functions

function getEnvConfig(): FirebaseConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  if (!apiKey || !projectId) return null
  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
}

function isFirebaseHosting(): boolean {
  const host = window.location.hostname
  return host.endsWith('.web.app') || host.endsWith('.firebaseapp.com')
}

async function fetchHostingConfig(): Promise<FirebaseConfig | null> {
  try {
    const res = await fetch('/__/firebase/init.json')
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function bootstrap(config: FirebaseConfig) {
  app = initializeApp(config)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
  functions = getFunctions(app, 'europe-west1')

  // Connect to emulators only when explicitly enabled AND running locally.
  // The hostname guard prevents emulator connections on production if the
  // env var accidentally leaks into a deployed build.
  const isLocal = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  if (import.meta.env.VITE_USE_EMULATORS === 'true' && isLocal) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
      connectFirestoreEmulator(db, 'localhost', 8080)
      connectStorageEmulator(storage, 'localhost', 9199)
      connectFunctionsEmulator(functions, 'localhost', 5001)
    } catch {
      // Emulators already connected
    }
  }
}

// Synchronous init from env vars (covers local dev with .env)
const envConfig = getEnvConfig()
if (envConfig) {
  bootstrap(envConfig)
}

/**
 * Resolves to `true` when Firebase is ready, `false` if config is missing.
 * On Firebase Hosting (*.web.app / *.firebaseapp.com), auto-fetches config
 * from the reserved `/__/firebase/init.json` endpoint when env vars are absent.
 */
export const firebaseReady: Promise<boolean> = envConfig
  ? Promise.resolve(true)
  : (async () => {
      if (isFirebaseHosting()) {
        const config = await fetchHostingConfig()
        if (config) {
          bootstrap(config)
          return true
        }
      }
      return false
    })()

export { app, auth, db, storage, functions }

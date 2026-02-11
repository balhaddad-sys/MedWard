import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import type { User } from '@/types'

const googleProvider = new GoogleAuthProvider()

/**
 * Get an existing user profile or create a default one for new users.
 * This is the single source of truth for profile creation to avoid race
 * conditions between onAuthStateChanged and getRedirectResult.
 */
export const getOrCreateProfile = async (firebaseUser: FirebaseUser): Promise<User> => {
  const profilePromise = (async () => {
    const ref = doc(db, 'users', firebaseUser.uid)
    const docSnap = await getDoc(ref)
    if (docSnap.exists()) {
      await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true })
      return { id: docSnap.id, ...docSnap.data() } as User
    }
    const newProfile = {
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      role: 'physician' as const,
      department: '',
      wardIds: [] as string[],
      preferences: {
        defaultWard: '',
        defaultMode: 'ward' as const,
        notificationSettings: { criticalLabs: true, taskReminders: true, handoverAlerts: true },
        displaySettings: { compactView: false, showAISuggestions: true, labTrendDays: 7 },
      },
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    }
    await setDoc(ref, newProfile)
    const created = await getDoc(ref)
    return { id: created.id, ...created.data() } as User
  })()

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Profile fetch timed out')), 15_000)
  )

  return Promise.race([profilePromise, timeout])
}

/**
 * Handle redirect result on page load (for mobile / popup-blocked scenarios).
 * Must be called after Firebase is initialized — on the hosting auto-config
 * path, `auth` is not available at module load time.
 */
export const handleRedirectResult = async (): Promise<void> => {
  if (!auth) return
  try {
    const result = await getRedirectResult(auth)
    if (result?.user) {
      await getOrCreateProfile(result.user)
    }
  } catch {
    // no pending redirect
  }
}

export const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  let result
  try {
    result = await signInWithPopup(auth, googleProvider)
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    // Fall back to redirect for popup-blocked or cross-origin issues
    if (code === 'auth/popup-blocked' || code === 'auth/unauthorized-domain') {
      await signInWithRedirect(auth, googleProvider)
      // Page will reload — return never resolves
      return new Promise(() => {})
    }
    throw err
  }
  return result.user
}

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth)
}

export const getUserProfile = async (uid: string): Promise<User | null> => {
  const docSnap = await getDoc(doc(db, 'users', uid))
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as User
}

export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<void> => {
  await setDoc(doc(db, 'users', uid), data, { merge: true })
}

export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback)
}

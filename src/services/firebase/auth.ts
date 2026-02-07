import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import type { User } from '@/types'

const googleProvider = new GoogleAuthProvider()

export const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  await setDoc(
    doc(db, 'users', credential.user.uid),
    { lastLoginAt: serverTimestamp() },
    { merge: true }
  )
  return credential.user
}

export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  const result = await signInWithPopup(auth, googleProvider)
  const user = result.user
  const docSnap = await getDoc(doc(db, 'users', user.uid))
  if (!docSnap.exists()) {
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      role: 'physician',
      department: '',
      wardIds: [],
      preferences: {
        defaultWard: '',
        defaultMode: 'clinical',
        notificationSettings: { criticalLabs: true, taskReminders: true, handoverAlerts: true },
        displaySettings: { compactView: false, showAISuggestions: true, labTrendDays: 7 },
      },
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    })
  } else {
    await setDoc(doc(db, 'users', user.uid), { lastLoginAt: serverTimestamp() }, { merge: true })
  }
  return user
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

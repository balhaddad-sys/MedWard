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
  const credential = await signInWithPopup(auth, googleProvider)
  await setDoc(
    doc(db, 'users', credential.user.uid),
    {
      displayName: credential.user.displayName,
      email: credential.user.email,
      photoURL: credential.user.photoURL,
      lastLoginAt: serverTimestamp(),
    },
    { merge: true }
  )
  return credential.user
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

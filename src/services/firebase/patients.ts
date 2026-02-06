import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Patient, PatientFormData } from '@/types'

const patientsRef = collection(db, 'patients')

export const getPatients = async (wardId: string): Promise<Patient[]> => {
  const q = query(patientsRef, where('wardId', '==', wardId), orderBy('bedNumber'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Patient)
}

export const getPatient = async (id: string): Promise<Patient | null> => {
  const docSnap = await getDoc(doc(db, 'patients', id))
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Patient
}

export const createPatient = async (data: PatientFormData, userId: string): Promise<string> => {
  const docRef = await addDoc(patientsRef, {
    ...data,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export const updatePatient = async (id: string, data: Partial<PatientFormData>): Promise<void> => {
  await updateDoc(doc(db, 'patients', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export const deletePatient = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'patients', id))
}

export const subscribeToPatients = (
  wardId: string,
  callback: (patients: Patient[]) => void
): Unsubscribe => {
  const q = wardId
    ? query(patientsRef, where('wardId', '==', wardId), orderBy('bedNumber'))
    : query(patientsRef, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const patients = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Patient)
    callback(patients)
  })
}

export const subscribeToAllPatients = (
  callback: (patients: Patient[]) => void
): Unsubscribe => {
  return onSnapshot(patientsRef, (snapshot) => {
    const patients = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Patient)
    callback(patients)
  }, (error) => {
    console.error('Patient subscription error:', error)
  })
}

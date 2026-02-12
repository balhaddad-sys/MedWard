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

const getPatientsRef = () => collection(db, 'patients')

const safePatient = (id: string, data: Record<string, unknown>): Patient => ({
  mrn: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'other',
  wardId: 'default',
  bedNumber: '',
  acuity: 3,
  primaryDiagnosis: '',
  diagnoses: [],
  allergies: [],
  codeStatus: 'full',
  attendingPhysician: '',
  team: '',
  createdBy: '',
  ...data,
  id,
} as unknown as Patient)

export const getPatients = async (wardId?: string): Promise<Patient[]> => {
  const q = wardId
    ? query(getPatientsRef(), where('wardId', '==', wardId))
    : getPatientsRef()
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => safePatient(doc.id, doc.data()))
}

export const getAllPatients = async (): Promise<Patient[]> => {
  const snapshot = await getDocs(getPatientsRef())
  return snapshot.docs.map((doc) => safePatient(doc.id, doc.data()))
}

export const getPatient = async (id: string): Promise<Patient | null> => {
  const docSnap = await getDoc(doc(db, 'patients', id))
  if (!docSnap.exists()) return null
  return safePatient(docSnap.id, docSnap.data())
}

export const createPatient = async (data: PatientFormData, userId: string): Promise<string> => {
  const docRef = await addDoc(getPatientsRef(), {
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
  userId: string,
  callback: (patients: Patient[]) => void
): Unsubscribe => {
  const q = query(
    getPatientsRef(),
    where('createdBy', '==', userId),
    where('wardId', '==', wardId),
    orderBy('bedNumber')
  )
  return onSnapshot(q, (snapshot) => {
    const patients = snapshot.docs.map((doc) => safePatient(doc.id, doc.data()))
    callback(patients)
  }, (error) => {
    console.error('Patient subscription error:', error)
    callback([])
  })
}

export const subscribeToAllPatients = (
  userId: string,
  callback: (patients: Patient[]) => void
): Unsubscribe => {
  const q = query(getPatientsRef(), where('createdBy', '==', userId))
  return onSnapshot(q, (snapshot) => {
    const patients = snapshot.docs.map((doc) => safePatient(doc.id, doc.data()))
    callback(patients)
  }, (error) => {
    console.error('All patients subscription error:', error)
    callback([])
  })
}

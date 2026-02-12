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
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Patient, PatientFormData } from '@/types'
import type { PatientState } from '@/types/patientState'

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
  // NEW Phase 0 fields with defaults
  state: 'incoming' as PatientState,
  stateChangedAt: Timestamp.now(),
  stateChangedBy: '',
  teamId: 'default',
  assignedClinicians: [],
  modificationHistory: [],
  lastModifiedBy: '',
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
    // Phase 0: Set default state management fields
    state: 'incoming',
    stateChangedAt: serverTimestamp(),
    stateChangedBy: userId,
    teamId: 'default',
    assignedClinicians: [userId],
    modificationHistory: [],
    lastModifiedBy: userId,
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

export const subscribeToUserPatients = (
  userId: string,
  callback: (patients: Patient[]) => void
): Unsubscribe => {
  const q = query(getPatientsRef(), where('createdBy', '==', userId), orderBy('bedNumber'))
  return onSnapshot(q, (snapshot) => {
    const patients = snapshot.docs.map((doc) => safePatient(doc.id, doc.data()))
    callback(patients)
  }, (error) => {
    console.error('User patients subscription error:', error)
    callback([])
  })
}

/**
 * NEW (Phase 0): Subscribe to patients by state
 * Team-based access with state filtering
 */
export const subscribeToPatientsByState = (
  teamId: string,
  userId: string,
  states: PatientState[],
  callback: (patients: Patient[]) => void
): Unsubscribe => {
  // Note: Firestore 'in' query supports up to 10 values
  const q = query(
    getPatientsRef(),
    where('teamId', '==', teamId),
    where('state', 'in', states),
    orderBy('stateChangedAt', 'desc')
  )

  return onSnapshot(q, (snapshot) => {
    // Filter by assignedClinicians on client side (array-contains not compatible with 'in')
    const patients = snapshot.docs
      .map((doc) => safePatient(doc.id, doc.data()))
      .filter(p => p.assignedClinicians.includes(userId))
    callback(patients)
  }, (error) => {
    console.error('Patients by state subscription error:', error)
    callback([])
  })
}

/**
 * NEW (Phase 0): Get patients by state (one-time fetch)
 */
export const getPatientsByState = async (
  teamId: string,
  userId: string,
  states: PatientState[]
): Promise<Patient[]> => {
  const q = query(
    getPatientsRef(),
    where('teamId', '==', teamId),
    where('state', 'in', states),
    orderBy('stateChangedAt', 'desc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((doc) => safePatient(doc.id, doc.data()))
    .filter(p => p.assignedClinicians.includes(userId))
}

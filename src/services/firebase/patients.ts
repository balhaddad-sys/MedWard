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
  console.log('🔍 Creating patient with data:', data);
  console.log('🔍 User ID:', userId);

  try {
    // Clean up data: convert empty strings to undefined, keep arrays and numbers as-is
    const cleanData: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
      // Keep arrays (allergies, diagnoses) even if empty
      if (Array.isArray(value)) {
        cleanData[key] = value;
      }
      // Keep numbers (acuity)
      else if (typeof value === 'number') {
        cleanData[key] = value;
      }
      // Convert empty strings to undefined (will be omitted by Firestore)
      else if (typeof value === 'string' && value.trim() === '') {
        // Skip empty strings - don't add to cleanData
      }
      // Keep non-empty strings
      else if (value !== undefined && value !== null) {
        cleanData[key] = value;
      }
    });

    // Ensure acuity is always a number (default to 3 if missing)
    if (!cleanData.acuity || typeof cleanData.acuity !== 'number') {
      cleanData.acuity = 3;
    }

    const patientData: Record<string, unknown> = {
      ...cleanData,
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
    };

    console.log('📤 Sending to Firestore (fields):', Object.keys(patientData));
    console.log('📤 acuity type:', typeof patientData.acuity, 'value:', patientData.acuity);
    console.log('📤 state value:', patientData.state);

    const docRef = await addDoc(getPatientsRef(), patientData);
    console.log('✅ Patient created successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating patient:', error);
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error name:', error.name);
    }
    throw error;
  }
}

export const updatePatient = async (id: string, data: Partial<PatientFormData>): Promise<void> => {
  // Clean up data: convert empty strings to undefined
  const cleanData: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      cleanData[key] = value;
    } else if (typeof value === 'number') {
      cleanData[key] = value;
    } else if (typeof value === 'string' && value.trim() === '') {
      // Skip empty strings
    } else if (value !== undefined && value !== null) {
      cleanData[key] = value;
    }
  });

  await updateDoc(doc(db, 'patients', id), {
    ...cleanData,
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

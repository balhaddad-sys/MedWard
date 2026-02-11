import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { PatientHistory } from '@/types/history'
import { EMPTY_HISTORY } from '@/types/history'

/**
 * Get patient history document. Returns null if no history exists yet.
 * History is stored as a single document at patients/{patientId}/history/current
 */
export const getPatientHistory = async (patientId: string): Promise<PatientHistory | null> => {
  const docRef = doc(db, 'patients', patientId, 'history', 'current')
  const snapshot = await getDoc(docRef)
  if (!snapshot.exists()) return null
  return { ...EMPTY_HISTORY, ...snapshot.data(), patientId } as PatientHistory
}

/**
 * Save (create or update) patient history document.
 */
export const savePatientHistory = async (
  patientId: string,
  history: Omit<PatientHistory, 'patientId' | 'updatedAt' | 'updatedBy'>,
  userId: string
): Promise<void> => {
  const docRef = doc(db, 'patients', patientId, 'history', 'current')
  await setDoc(docRef, {
    ...history,
    patientId,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  })
}

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/config/firebase'
import type { LabPanel } from '@/types'

export const getLabPanels = async (patientId: string, maxResults = 50): Promise<LabPanel[]> => {
  const q = query(
    collection(db, 'patients', patientId, 'labs'),
    orderBy('collectedAt', 'desc'),
    limit(maxResults)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as LabPanel)
}

export const addLabPanel = async (patientId: string, panel: Omit<LabPanel, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'patients', patientId, 'labs'), {
    ...panel,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export const updateLabPanel = async (
  patientId: string,
  labId: string,
  data: Partial<LabPanel>
): Promise<void> => {
  await updateDoc(doc(db, 'patients', patientId, 'labs', labId), data)
}

export const markLabReviewed = async (
  patientId: string,
  labId: string,
  reviewerId: string
): Promise<void> => {
  await updateDoc(doc(db, 'patients', patientId, 'labs', labId), {
    status: 'reviewed',
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
  })
}

export const subscribeToLabs = (
  patientId: string,
  callback: (labs: LabPanel[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'patients', patientId, 'labs'),
    orderBy('collectedAt', 'desc')
  )
  return onSnapshot(q, (snapshot) => {
    const labs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as LabPanel)
    callback(labs)
  })
}

export const uploadLabImage = async (
  userId: string,
  file: File
): Promise<string> => {
  const storageRef = ref(storage, `lab-images/${userId}/${Date.now()}-${file.name}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export const getCriticalLabs = async (wardId: string): Promise<LabPanel[]> => {
  const q = query(
    collection(db, 'patients'),
    where('wardId', '==', wardId)
  )
  const patientsSnap = await getDocs(q)
  const criticalLabs: LabPanel[] = []
  for (const patDoc of patientsSnap.docs) {
    const labsQ = query(
      collection(db, 'patients', patDoc.id, 'labs'),
      where('status', '==', 'resulted'),
      orderBy('collectedAt', 'desc'),
      limit(10)
    )
    const labsSnap = await getDocs(labsQ)
    for (const labDoc of labsSnap.docs) {
      const lab = { id: labDoc.id, ...labDoc.data() } as LabPanel
      const hasCritical = (lab.values ?? []).some(
        (v) => v.flag === 'critical_low' || v.flag === 'critical_high'
      )
      if (hasCritical) criticalLabs.push(lab)
    }
  }
  return criticalLabs
}

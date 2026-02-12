import {
  collection,
  doc,
  getDocs,
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
import type { Task, TaskFormData } from '@/types'

const getTasksRef = () => collection(db, 'tasks')

const safeTask = (id: string, data: Record<string, unknown>): Task => ({
  status: 'pending',
  priority: 'medium',
  category: 'other',
  title: '',
  description: '',
  patientId: '',
  patientName: '',
  bedNumber: '',
  assignedTo: '',
  assignedToName: '',
  createdBy: '',
  createdByName: '',
  ...data,
  id,
} as Task)

export const getTasks = async (wardId?: string): Promise<Task[]> => {
  const q = wardId
    ? query(getTasksRef(), where('wardId', '==', wardId))
    : getTasksRef()
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => safeTask(doc.id, doc.data()))
}

export const getTasksByPatient = async (patientId: string): Promise<Task[]> => {
  const q = query(getTasksRef(), where('patientId', '==', patientId), orderBy('dueAt'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => safeTask(doc.id, doc.data()))
}

export const createTask = async (data: TaskFormData, userId: string, userName: string): Promise<string> => {
  const docRef = await addDoc(getTasksRef(), {
    ...data,
    status: 'pending',
    createdBy: userId,
    createdByName: userName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export const updateTask = async (id: string, data: Partial<Task>): Promise<void> => {
  await updateDoc(doc(db, 'tasks', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export const completeTask = async (id: string, userId: string): Promise<void> => {
  await updateDoc(doc(db, 'tasks', id), {
    status: 'completed',
    completedAt: serverTimestamp(),
    completedBy: userId,
    updatedAt: serverTimestamp(),
  })
}

export const deleteTask = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'tasks', id))
}

export const subscribeToTasks = (userId: string, callback: (tasks: Task[]) => void): Unsubscribe => {
  const q = query(getTasksRef(), where('createdBy', '==', userId))
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => safeTask(doc.id, doc.data()))
    callback(tasks)
  }, (error) => {
    console.error('Task subscription error:', error)
    callback([])
  })
}

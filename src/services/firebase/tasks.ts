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

const tasksRef = collection(db, 'tasks')

export const getTasks = async (wardId?: string): Promise<Task[]> => {
  const q = wardId
    ? query(tasksRef, where('wardId', '==', wardId))
    : tasksRef
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Task)
}

export const getTasksByPatient = async (patientId: string): Promise<Task[]> => {
  const q = query(tasksRef, where('patientId', '==', patientId), orderBy('dueAt'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Task)
}

export const createTask = async (data: TaskFormData, userId: string, userName: string): Promise<string> => {
  const docRef = await addDoc(tasksRef, {
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

export const subscribeToTasks = (callback: (tasks: Task[]) => void): Unsubscribe => {
  return onSnapshot(tasksRef, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Task)
    callback(tasks)
  })
}

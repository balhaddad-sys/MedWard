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

export const subscribeToUserTasks = (
  userId: string,
  callback: (tasks: Task[]) => void
): Unsubscribe => {
  const q = query(
    getTasksRef(),
    where('createdBy', '==', userId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(
    q,
    (snapshot) => {
      const tasks = snapshot.docs.map((doc) => safeTask(doc.id, doc.data()))
      callback(tasks)
    },
    (error) => {
      console.error('User task subscription error:', error)
      callback([])
    }
  )
}

/**
 * NEW (Phase 2): Get overdue or unacknowledged tasks
 * Returns tasks that are:
 * - Past due date AND not completed
 * - OR high/critical priority AND not acknowledged
 */
export const getOverdueTasks = async (userId: string): Promise<Task[]> => {
  // Get all pending/in_progress tasks for user
  const q = query(
    getTasksRef(),
    where('assignedTo', '==', userId),
    where('status', 'in', ['pending', 'in_progress'])
  )
  const snapshot = await getDocs(q)
  const tasks = snapshot.docs.map((doc) => safeTask(doc.id, doc.data()))

  const now = new Date()

  // Filter for overdue or unacknowledged high-priority tasks
  return tasks.filter((task) => {
    // Overdue: has dueAt and it's in the past
    if (task.dueAt) {
      const dueDate =
        typeof task.dueAt === 'object' && 'toDate' in task.dueAt
          ? task.dueAt.toDate()
          : new Date(task.dueAt)
      if (dueDate < now) return true
    }

    // Unacknowledged high/critical priority tasks
    if (
      (task.priority === 'high' || task.priority === 'critical') &&
      !task.acknowledgedAt
    ) {
      return true
    }

    return false
  })
}

/**
 * NEW (Phase 0.2): Acknowledge a task
 * Marks task as seen/acknowledged by user
 */
export const acknowledgeTask = async (taskId: string, userId: string): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId)
  await updateDoc(taskRef, {
    acknowledgedAt: serverTimestamp(),
    acknowledgedBy: userId,
    updatedAt: serverTimestamp(),
  })
}

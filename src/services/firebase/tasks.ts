import {
  collection,
  doc,
  getDocs,
  addDoc,
  writeBatch,
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
import { isTaskExpiredForDeletion, isTaskVisible } from '@/utils/taskLifecycle'
import type { Task, TaskFormData } from '@/types'

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000
const getTasksRef = () => collection(db, 'tasks')

function omitUndefinedValues(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
}

const safeTask = (id: string, data: Record<string, unknown>): Task => ({
  id,
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
  viewedBy: [],
  escalationLevel: 'none',
  ...data,
} as unknown as Task)

export const getTasks = async (wardId?: string): Promise<Task[]> => {
  const q = wardId
    ? query(getTasksRef(), where('wardId', '==', wardId))
    : getTasksRef()
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => safeTask(doc.id, doc.data())).filter((task) => isTaskVisible(task))
}

export const getTasksByPatient = async (patientId: string): Promise<Task[]> => {
  const q = query(getTasksRef(), where('patientId', '==', patientId), orderBy('dueAt'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => safeTask(doc.id, doc.data())).filter((task) => isTaskVisible(task))
}

export const createTask = async (data: TaskFormData, userId: string, userName: string): Promise<string> => {
  const docRef = await addDoc(getTasksRef(), {
    ...data,
    status: 'pending',
    createdBy: userId,
    createdByName: userName,
    viewedBy: [],
    escalationLevel: 'none',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Create multiple auto-generated tasks in a single batch write.
 * Used by clerking workflow to convert problem list items into actionable tasks.
 */
export const createGeneratedTasks = async (tasks: Partial<Task>[]): Promise<string[]> => {
  if (tasks.length === 0) return []

  const now = Timestamp.now()
  const batch = writeBatch(db)
  const taskIds: string[] = []

  for (const task of tasks) {
    const taskRef = doc(getTasksRef())
    taskIds.push(taskRef.id)

    const payload = omitUndefinedValues({
      ...task,
      status: task.status ?? 'pending',
      priority: task.priority ?? 'medium',
      category: task.category ?? 'other',
      viewedBy: task.viewedBy ?? [],
      escalationLevel: task.escalationLevel ?? 'none',
      createdAt: task.createdAt ?? now,
      updatedAt: now,
    })

    batch.set(taskRef, payload)
  }

  await batch.commit()
  return taskIds
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
    autoDeleteAt: new Date(Date.now() + FIVE_HOURS_MS),
    completedBy: userId,
    updatedAt: serverTimestamp(),
  })
}

export const deleteTask = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'tasks', id))
}

export const subscribeToTasks = (userId: string, callback: (tasks: Task[]) => void): Unsubscribe => {
  const q = query(getTasksRef(), where('createdBy', '==', userId))
  return onSnapshot(
    q,
    (snapshot) => {
      const tasks = snapshot.docs.map((doc) => safeTask(doc.id, doc.data())).filter((task) => isTaskVisible(task))
      callback(tasks)
    },
    (error) => {
      console.error('Task subscription error:', error)
      callback([])
    }
  )
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
      const tasks = snapshot.docs.map((doc) => safeTask(doc.id, doc.data())).filter((task) => isTaskVisible(task))
      callback(tasks)
    },
    (error) => {
      console.error('User task subscription error:', error)
      callback([])
    }
  )
}

export const getOverdueTasks = async (userId: string): Promise<Task[]> => {
  const q = query(
    getTasksRef(),
    where('assignedTo', '==', userId),
    where('status', 'in', ['pending', 'in_progress'])
  )
  const snapshot = await getDocs(q)
  const tasks = snapshot.docs.map((doc) => safeTask(doc.id, doc.data())).filter((task) => isTaskVisible(task))

  const now = new Date()

  return tasks.filter((task) => {
    if (task.dueAt) {
      const dueDate =
        typeof task.dueAt === 'object' && 'toDate' in task.dueAt
          ? task.dueAt.toDate()
          : new Date(task.dueAt)
      if (dueDate < now) return true
    }

    if (
      (task.priority === 'high' || task.priority === 'critical') &&
      !task.acknowledgedAt
    ) {
      return true
    }

    return false
  })
}

export const acknowledgeTask = async (taskId: string, userId: string): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId)
  await updateDoc(taskRef, {
    acknowledgedAt: serverTimestamp(),
    acknowledgedBy: userId,
    updatedAt: serverTimestamp(),
  })
}

export const purgeExpiredCompletedTasks = async (userId: string): Promise<number> => {
  const q = query(getTasksRef(), where('createdBy', '==', userId))
  const snapshot = await getDocs(q)

  const expiredDocs = snapshot.docs.filter((docSnap) => {
    const task = safeTask(docSnap.id, docSnap.data())
    return isTaskExpiredForDeletion(task)
  })

  if (expiredDocs.length === 0) return 0

  const results = await Promise.allSettled(expiredDocs.map((docSnap) => deleteDoc(docSnap.ref)))
  return results.filter((r) => r.status === 'fulfilled').length
}

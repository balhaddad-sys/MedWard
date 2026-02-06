import { v4 as uuidv4 } from 'uuid'
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import { validateWardTask } from '@/schemas'
import type { WardTask } from '@/schemas'

export interface TaskTemplateData {
  text: string
  tag?: WardTask['tag']
  priority?: WardTask['priority']
  due?: string
}

export interface PatientInfo {
  name: string
  bed: string
  diagnosis?: string
}

export async function createWardTask(
  patientId: string,
  taskData: TaskTemplateData,
  userId: string
): Promise<WardTask> {
  const task = {
    taskId: uuidv4(),
    text: taskData.text,
    status: 'open' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    due: taskData.due || 'today',
    tag: taskData.tag || 'other',
    priority: taskData.priority || 'routine',
    patientId,
  }

  const validation = validateWardTask(task)
  if (!validation.success) {
    throw new Error(`Invalid task: ${validation.error.message}`)
  }

  const taskRef = doc(db, 'patients', patientId, 'wardTasks', task.taskId)
  await setDoc(taskRef, task)
  return task as unknown as WardTask
}

export async function updateWardTaskStatus(
  patientId: string,
  taskId: string,
  status: 'open' | 'done' | 'deferred'
): Promise<void> {
  const taskRef = doc(db, 'patients', patientId, 'wardTasks', taskId)
  await updateDoc(taskRef, { status, updatedAt: serverTimestamp() })
}

export async function completeWardTask(patientId: string, taskId: string): Promise<void> {
  return updateWardTaskStatus(patientId, taskId, 'done')
}

export async function deferWardTask(patientId: string, taskId: string): Promise<void> {
  const taskRef = doc(db, 'patients', patientId, 'wardTasks', taskId)
  await updateDoc(taskRef, {
    status: 'deferred',
    due: 'tomorrow',
    updatedAt: serverTimestamp(),
  })
}

export function subscribeToWardTasks(
  patientId: string,
  callback: (tasks: WardTask[]) => void
): Unsubscribe {
  const tasksRef = collection(db, 'patients', patientId, 'wardTasks')
  const q = query(tasksRef, orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((d) => ({ ...d.data(), taskId: d.id }) as WardTask)
    callback(tasks)
  })
}

export function subscribeToOpenWardTasks(
  patientId: string,
  callback: (tasks: WardTask[]) => void
): Unsubscribe {
  const tasksRef = collection(db, 'patients', patientId, 'wardTasks')
  const q = query(tasksRef, where('status', '==', 'open'))
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((d) => d.data() as WardTask)
    callback(tasks)
  })
}

export function generateHandoverText(tasks: WardTask[], patientInfo: PatientInfo): string {
  const openTasks = tasks.filter((t) => t.status === 'open' || t.status === 'deferred')

  if (openTasks.length === 0) {
    return `**${patientInfo.name}** (${patientInfo.bed})\nNo outstanding tasks.`
  }

  const urgent = openTasks.filter((t) => t.priority === 'urgent')
  const important = openTasks.filter((t) => t.priority === 'important')
  const routine = openTasks.filter((t) => t.priority === 'routine')

  let text = `**${patientInfo.name}** (${patientInfo.bed})\n`
  text += `Dx: ${patientInfo.diagnosis || 'Unknown'}\n\n`

  if (urgent.length > 0) {
    text += `URGENT:\n`
    urgent.forEach((t) => { text += `  - ${t.text}${t.tag ? ` [${t.tag}]` : ''}\n` })
    text += '\n'
  }
  if (important.length > 0) {
    text += `Important:\n`
    important.forEach((t) => { text += `  - ${t.text}${t.tag ? ` [${t.tag}]` : ''}\n` })
    text += '\n'
  }
  if (routine.length > 0) {
    text += `Routine:\n`
    routine.forEach((t) => { text += `  - ${t.text}${t.tag ? ` [${t.tag}]` : ''}\n` })
  }

  return text
}

export function generateWardHandover(
  patientsWithTasks: Array<{ patient: PatientInfo; tasks: WardTask[] }>
): string {
  const timestamp = new Date().toLocaleString()
  let handover = `=== WARD HANDOVER ===\nGenerated: ${timestamp}\n\n`
  for (const { patient, tasks } of patientsWithTasks) {
    handover += generateHandoverText(tasks, patient)
    handover += '\n---\n\n'
  }
  return handover
}

export const TASK_TEMPLATES: TaskTemplateData[] = [
  { text: 'Repeat labs tomorrow', tag: 'labs', priority: 'routine' },
  { text: 'Chase CT report', tag: 'imaging', priority: 'important' },
  { text: 'Call specialty consult', tag: 'consult', priority: 'important' },
  { text: 'Restart home medications', tag: 'meds', priority: 'routine' },
  { text: 'Complete discharge summary', tag: 'discharge', priority: 'routine' },
  { text: 'Family meeting', tag: 'other', priority: 'important' },
]

import { useEffect, useState } from 'react'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { getPatient } from '@/services/firebase/patients'
import { getLabPanels } from '@/services/firebase/labs'
import { createTask, updateTask, completeTask, deleteTask } from '@/services/firebase/tasks'
import { exportSBARReport } from '@/services/export/pdfExport'
import { generateSBARReport, type SBARData } from '@/services/ai/sbarGenerator'
import { analyzeLabPanel } from '@/services/ai/labAnalysis'
import { ACUITY_LEVELS } from '@/config/constants'
import type { Patient, LabPanel, LabAIAnalysis, Task, TaskFormData } from '@/types'

export function usePatientDetail(id: string | undefined) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [labs, setLabs] = useState<LabPanel[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [showLabEntry, setShowLabEntry] = useState(false)
  const [labEntryMode, setLabEntryMode] = useState<'manual' | 'upload'>('manual')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const storePatients = usePatientStore((s) => s.patients)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks = useTaskStore((s) => s.tasks)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)
  const taskStoreUpdate = useTaskStore((s) => s.updateTask)
  const taskStoreRemove = useTaskStore((s) => s.removeTask)

  // SBAR state
  const [sbar, setSbar] = useState<SBARData | null>(null)
  const [generatingSbar, setGeneratingSbar] = useState(false)

  // Lab AI analysis
  const [labAnalysis, setLabAnalysis] = useState<LabAIAnalysis | null>(null)
  const [analyzingLab, setAnalyzingLab] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    // Try store first (already loaded by onSnapshot)
    const storePatient = storePatients.find((p) => p.id === id)
    if (storePatient) {
      setPatient(storePatient)
    }

    const load = async () => {
      setLoading(true)
      if (!storePatient) {
        try {
          const p = await getPatient(id)
          setPatient(p)
        } catch (err) {
          console.error('Failed to load patient:', err)
          setPatient(null)
        }
      }
      try {
        const l = await getLabPanels(id)
        setLabs(l)
      } catch (err) {
        console.error('Failed to load labs:', err)
        setLabs([])
      }
      setLoading(false)
    }
    load()
  }, [id, storePatients])

  const patientCriticals = criticalValues.filter((cv) => cv.patientId === id)
  const patientTasks = tasks.filter((t) => t.patientId === id)
  const pendingTasks = patientTasks.filter((t) => (t.status ?? 'pending') !== 'completed')
  const completedTasks = patientTasks.filter((t) => (t.status ?? 'pending') === 'completed')

  const acuityKey = patient
    ? ((patient.acuity >= 1 && patient.acuity <= 5 ? patient.acuity : 3) as keyof typeof ACUITY_LEVELS)
    : (3 as keyof typeof ACUITY_LEVELS)
  const acuityInfo = ACUITY_LEVELS[acuityKey]

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'labs', label: 'Labs', count: labs.length },
    { id: 'tasks', label: 'Tasks', count: pendingTasks.length },
    { id: 'sbar', label: 'SBAR' },
  ]

  const handleGenerateSBAR = async () => {
    if (!patient) return
    setGeneratingSbar(true)
    try {
      const result = await generateSBARReport(patient, labs, patientTasks)
      setSbar(result)
    } catch {
      setSbar({ situation: 'Failed to generate SBAR report', background: '', assessment: '', recommendation: '' })
    } finally {
      setGeneratingSbar(false)
    }
  }

  const handleAnalyzeLab = async (panelId: string) => {
    const panel = labs.find((l) => l.id === panelId)
    if (!panel || !patient) return
    setAnalyzingLab(true)
    try {
      const result = await analyzeLabPanel(panel, `${patient.firstName} ${patient.lastName}, ${patient.primaryDiagnosis}`)
      setLabAnalysis(result)
    } catch {
      setLabAnalysis(null)
    } finally {
      setAnalyzingLab(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    if (!firebaseUser) return
    try {
      await completeTask(taskId, firebaseUser.uid)
      taskStoreUpdate(taskId, { status: 'completed' })
      addToast({ type: 'success', title: 'Task marked as done' })
    } catch {
      addToast({ type: 'error', title: 'Failed to complete task' })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (deletingTaskId !== taskId) {
      setDeletingTaskId(taskId)
      return
    }
    try {
      await deleteTask(taskId)
      taskStoreRemove(taskId)
      addToast({ type: 'success', title: 'Task deleted' })
    } catch {
      addToast({ type: 'error', title: 'Failed to delete task' })
    }
    setDeletingTaskId(null)
  }

  const cancelDeleteTask = () => setDeletingTaskId(null)

  const handleTaskSubmit = async (data: TaskFormData) => {
    if (!firebaseUser) return
    if (editingTask) {
      const { dueAt: _dueAt, recurring: _recurring, ...rest } = data
      await updateTask(editingTask.id, rest)
      taskStoreUpdate(editingTask.id, rest as unknown as Partial<Task>)
      addToast({ type: 'success', title: 'Task updated' })
    } else {
      const userName = user?.displayName || 'Unknown'
      const payload: TaskFormData = { ...data, patientId: id! }
      await createTask(payload, firebaseUser.uid, userName)
      addToast({ type: 'success', title: 'Task created' })
    }
    setShowTaskForm(false)
    setEditingTask(null)
  }

  const handleExportSBAR = () => {
    if (patient && sbar) {
      exportSBARReport(patient, sbar)
    }
  }

  const refreshLabs = async () => {
    if (!id) return
    const updatedLabs = await getLabPanels(id)
    setLabs(updatedLabs)
  }

  return {
    // State
    patient,
    labs,
    activeTab,
    loading,
    showLabEntry,
    labEntryMode,
    showTaskForm,
    editingTask,
    sbar,
    generatingSbar,
    labAnalysis,
    analyzingLab,
    deletingTaskId,

    // Computed
    patientCriticals,
    patientTasks,
    pendingTasks,
    completedTasks,
    acuityInfo,
    tabs,

    // Setters
    setActiveTab,
    setShowLabEntry,
    setLabEntryMode,
    setShowTaskForm,
    setEditingTask,

    // Handlers
    handleGenerateSBAR,
    handleAnalyzeLab,
    handleCompleteTask,
    handleDeleteTask,
    cancelDeleteTask,
    handleTaskSubmit,
    handleExportSBAR,
    refreshLabs,
    addToast,
  }
}

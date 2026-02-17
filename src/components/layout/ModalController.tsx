import { useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { PatientForm } from '@/components/features/patients/PatientForm'
import { TaskForm } from '@/components/features/tasks/TaskForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useTaskStore } from '@/stores/taskStore'
import { usePatientStore } from '@/stores/patientStore'
import { createPatient, updatePatient } from '@/services/firebase/patients'
import { createTask, updateTask, completeTask, deleteTask } from '@/services/firebase/tasks'
import { CheckCircle, Edit, Trash2, Clock, User } from 'lucide-react'
import { formatRelativeTime } from '@/utils/formatters'
import type { PatientFormData, TaskFormData, Task } from '@/types'

export function ModalController() {
  const activeModal = useUIStore((s) => s.activeModal)
  const modalData = useUIStore((s) => s.modalData)
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const addToast = useUIStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)

  const tasks = useTaskStore((s) => s.tasks)
  const addTask = useTaskStore((s) => s.addTask)
  const storeUpdateTask = useTaskStore((s) => s.updateTask)
  const storeRemoveTask = useTaskStore((s) => s.removeTask)
  const patients = usePatientStore((s) => s.patients)

  const handlePatientSubmit = async (data: PatientFormData) => {
    if (!firebaseUser) {
      addToast({ type: 'error', title: 'Not logged in', message: 'Please log in to add patients.' })
      return
    }
    try {
      await createPatient(data, firebaseUser.uid)
      addToast({ type: 'success', title: 'Patient added successfully' })
      closeModal()
      // Store update handled by onSnapshot listener
    } catch (err) {
      console.error('Create patient failed:', err)
      addToast({ type: 'error', title: 'Failed to save patient', message: String(err) })
    }
  }

  const handlePatientUpdate = async (data: PatientFormData) => {
    const patientId = modalData?.patientId as string | undefined
    if (!patientId) return
    try {
      await updatePatient(patientId, data)
      addToast({ type: 'success', title: 'Patient updated successfully' })
      closeModal()
      // Store update handled by onSnapshot listener
    } catch (err) {
      console.error('Update patient failed:', err)
      addToast({ type: 'error', title: 'Failed to update patient', message: String(err) })
    }
  }

  const handleTaskSubmit = async (data: TaskFormData) => {
    if (!firebaseUser) return
    const taskId = modalData?.taskId as string | undefined

    try {
      if (taskId) {
        // Update existing task
        const { dueAt: _dueAt, recurring: _recurring, ...rest } = data
        await updateTask(taskId, rest)
        storeUpdateTask(taskId, rest as unknown as Partial<Task>)
        addToast({ type: 'success', title: 'Task updated successfully' })
      } else {
        // Create new task — enrich with patient name and bed number
        const userName = user?.displayName || 'Unknown'
        const patient = data.patientId ? patients.find((p) => p.id === data.patientId) : null
        const enrichedData = {
          ...data,
          patientName: patient ? `${patient.firstName} ${patient.lastName}`.trim() : '',
          bedNumber: patient?.bedNumber || '',
        }
        const id = await createTask(enrichedData, firebaseUser.uid, userName)
        addTask({ id, ...enrichedData, status: 'pending', createdAt: new Date(), updatedAt: new Date() } as never)
        addToast({ type: 'success', title: 'Task created successfully' })
      }
      closeModal()
    } catch {
      addToast({ type: 'error', title: taskId ? 'Failed to update task' : 'Failed to create task', message: 'Please try again.' })
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    if (!firebaseUser) return
    try {
      await completeTask(taskId, firebaseUser.uid)
      storeUpdateTask(taskId, { status: 'completed' })
      addToast({ type: 'success', title: 'Task marked as done' })
      closeModal()
    } catch {
      addToast({ type: 'error', title: 'Failed to complete task' })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      storeRemoveTask(taskId)
      addToast({ type: 'success', title: 'Task deleted' })
      closeModal()
    } catch {
      addToast({ type: 'error', title: 'Failed to delete task' })
    }
  }

  const handleEditTask = (task: Task) => {
    openModal('task-form', {
      taskId: task.id,
      initialData: {
        patientId: task.patientId,
        title: task.title,
        description: task.description || '',
        category: task.category || 'other',
        priority: task.priority || 'medium',
        assignedTo: task.assignedTo || '',
        notes: '',
      },
    })
  }

  // Find the current task for task-detail modal and enrich with patient data
  const currentTask = useMemo(() => {
    if (activeModal !== 'task-detail') return null
    const task = tasks.find((t) => t.id === modalData?.taskId)
    if (!task) return null
    if (task.patientName && task.bedNumber) return task
    if (!task.patientId) return task
    const patient = patients.find((p) => p.id === task.patientId)
    if (!patient) return task
    return {
      ...task,
      patientName: task.patientName || `${patient.firstName} ${patient.lastName}`.trim(),
      bedNumber: task.bedNumber || patient.bedNumber || '',
    }
  }, [activeModal, tasks, modalData?.taskId, patients])

  return (
    <>
      <Modal
        isOpen={activeModal === 'patient-form'}
        onClose={closeModal}
        title={modalData?.patientId ? 'Edit Patient' : 'Add Patient'}
        size="lg"
      >
        <PatientForm
          initialData={modalData?.initialData as Partial<PatientFormData> | undefined}
          onSubmit={modalData?.patientId ? handlePatientUpdate : handlePatientSubmit}
          onCancel={closeModal}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'task-form'}
        onClose={closeModal}
        title={modalData?.taskId ? 'Edit Task' : 'Create Task'}
        size="md"
      >
        <TaskForm
          initialData={modalData?.initialData as Partial<TaskFormData> | undefined}
          patientId={modalData?.patientId as string | undefined}
          onSubmit={handleTaskSubmit}
          onCancel={closeModal}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'task-detail'}
        onClose={closeModal}
        title="Task Details"
        size="md"
      >
        {currentTask ? (
          <div className="space-y-4">
            {/* Task header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-ward-text">{currentTask.title}</h3>
                <Badge
                  variant={currentTask.priority === 'critical' ? 'danger' : currentTask.priority === 'high' ? 'warning' : 'default'}
                  size="sm"
                >
                  {currentTask.priority || 'medium'}
                </Badge>
              </div>
              {currentTask.description && (
                <p className="text-sm text-ward-muted">{currentTask.description}</p>
              )}
            </div>

            {/* Task info rows */}
            <div className="space-y-2 py-3 border-y border-ward-border">
              <div className="flex justify-between text-sm">
                <span className="text-ward-muted">Patient</span>
                <span className="font-medium text-ward-text">{currentTask.patientName || '—'} {currentTask.bedNumber ? `· Bed ${currentTask.bedNumber}` : ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ward-muted">Category</span>
                <span className="font-medium text-ward-text capitalize">{currentTask.category || 'other'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ward-muted">Status</span>
                <Badge variant={(currentTask.status ?? 'pending') === 'completed' ? 'success' : (currentTask.status ?? 'pending') === 'in_progress' ? 'info' : 'default'} size="sm">
                  {(currentTask.status ?? 'pending').replace('_', ' ')}
                </Badge>
              </div>
              {currentTask.assignedToName && (
                <div className="flex justify-between text-sm">
                  <span className="text-ward-muted flex items-center gap-1"><User className="h-3.5 w-3.5" /> Assigned to</span>
                  <span className="font-medium text-ward-text">{currentTask.assignedToName}</span>
                </div>
              )}
              {currentTask.dueAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-ward-muted flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Due</span>
                  <span className="font-medium text-ward-text">{formatRelativeTime(currentTask.dueAt)}</span>
                </div>
              )}
              {currentTask.notes && (
                <div className="pt-1">
                  <span className="text-xs text-ward-muted block mb-1">Notes</span>
                  <p className="text-sm text-ward-text bg-ward-bg rounded-lg p-2">{currentTask.notes}</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {(currentTask.status ?? 'pending') !== 'completed' ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 min-h-[44px]"
                  icon={<CheckCircle className="h-4 w-4" />}
                  onClick={() => handleCompleteTask(currentTask.id)}
                >
                  Mark as Done
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 min-h-[44px]"
                  icon={<Edit className="h-4 w-4" />}
                  onClick={() => handleEditTask(currentTask)}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-[44px] text-red-600 hover:bg-red-50 border-red-200"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => handleDeleteTask(currentTask.id)}
                >
                  Delete
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">This task has been completed</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-ward-muted text-center py-8">Task not found</p>
        )}
      </Modal>
    </>
  )
}

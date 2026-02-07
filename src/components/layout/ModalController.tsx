import { Modal } from '@/components/ui/Modal'
import { PatientForm } from '@/components/features/patients/PatientForm'
import { TaskForm } from '@/components/features/tasks/TaskForm'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { createPatient, updatePatient } from '@/services/firebase/patients'
import { createTask } from '@/services/firebase/tasks'
import type { PatientFormData, TaskFormData } from '@/types'

export function ModalController() {
  const activeModal = useUIStore((s) => s.activeModal)
  const modalData = useUIStore((s) => s.modalData)
  const closeModal = useUIStore((s) => s.closeModal)
  const addToast = useUIStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const addPatient = usePatientStore((s) => s.addPatient)
  const addTask = useTaskStore((s) => s.addTask)

  const handlePatientSubmit = async (data: PatientFormData) => {
    if (!firebaseUser) return
    try {
      const id = await createPatient(data, firebaseUser.uid)
      addPatient({ id, ...data, createdAt: new Date(), updatedAt: new Date() } as never)
      addToast({ type: 'success', title: 'Patient added successfully' })
      closeModal()
    } catch {
      addToast({ type: 'error', title: 'Failed to save patient', message: 'Please try again.' })
    }
  }

  const handlePatientUpdate = async (data: PatientFormData) => {
    const patientId = modalData?.patientId as string | undefined
    if (!patientId) return
    try {
      await updatePatient(patientId, data)
      addToast({ type: 'success', title: 'Patient updated successfully' })
      closeModal()
    } catch {
      addToast({ type: 'error', title: 'Failed to update patient', message: 'Please try again.' })
    }
  }

  const handleTaskSubmit = async (data: TaskFormData) => {
    if (!firebaseUser) return
    try {
      const userName = user?.displayName || 'Unknown'
      const id = await createTask(data, firebaseUser.uid, userName)
      addTask({ id, ...data, status: 'pending', createdAt: new Date(), updatedAt: new Date() } as never)
      addToast({ type: 'success', title: 'Task created successfully' })
      closeModal()
    } catch {
      addToast({ type: 'error', title: 'Failed to create task', message: 'Please try again.' })
    }
  }

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
    </>
  )
}

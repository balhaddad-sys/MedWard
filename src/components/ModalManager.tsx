import { Modal } from '@/components/ui/Modal'
import { PatientForm } from '@/components/features/patients/PatientForm'
import { TaskForm } from '@/components/features/tasks/TaskForm'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { createPatient } from '@/services/firebase/patients'
import { createTask } from '@/services/firebase/tasks'
import type { PatientFormData, TaskFormData } from '@/types'

export function ModalManager() {
  const activeModal = useUIStore((s) => s.activeModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const addToast = useUIStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)

  const handleCreatePatient = async (data: PatientFormData) => {
    try {
      await createPatient(data, firebaseUser?.uid || '')
      addToast({ type: 'success', title: 'Patient added successfully' })
      closeModal()
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to add patient', message: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  const handleCreateTask = async (data: TaskFormData) => {
    try {
      await createTask(data, firebaseUser?.uid || '', user?.displayName || 'User')
      addToast({ type: 'success', title: 'Task created successfully' })
      closeModal()
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create task', message: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  return (
    <>
      <Modal isOpen={activeModal === 'patient-form'} onClose={closeModal} title="Add Patient" size="lg">
        <PatientForm onSubmit={handleCreatePatient} onCancel={closeModal} />
      </Modal>

      <Modal isOpen={activeModal === 'task-form'} onClose={closeModal} title="Create Task">
        <TaskForm onSubmit={handleCreateTask} onCancel={closeModal} />
      </Modal>
    </>
  )
}

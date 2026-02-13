import { Plus, CheckCircle, Zap } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TaskForm } from '@/components/features/tasks/TaskForm'
import { PatientTaskCard } from './PatientTaskCard'
import type { Task, TaskFormData } from '@/types'

interface TasksTabProps {
  id: string | undefined
  showTaskForm: boolean
  setShowTaskForm: (show: boolean) => void
  editingTask: Task | null
  setEditingTask: (task: Task | null) => void
  handleTaskSubmit: (data: TaskFormData) => Promise<void>
  handleCompleteTask: (taskId: string) => void
  handleDeleteTask: (taskId: string) => void
  deletingTaskId: string | null
  cancelDeleteTask: () => void
  pendingTasks: Task[]
  completedTasks: Task[]
  patientTasks: Task[]
  setShowOrderSetModal?: (show: boolean) => void
}

export function TasksTab({
  id,
  showTaskForm,
  setShowTaskForm,
  editingTask,
  setEditingTask,
  handleTaskSubmit,
  handleCompleteTask,
  handleDeleteTask,
  deletingTaskId,
  cancelDeleteTask,
  pendingTasks,
  completedTasks,
  patientTasks,
  setShowOrderSetModal,
}: TasksTabProps) {
  return (
    <div className="space-y-4">
      {!showTaskForm && (
        <div className="flex justify-end gap-2">
          {setShowOrderSetModal && (
            <Button
              size="sm"
              variant="secondary"
              icon={<Zap className="h-4 w-4" />}
              onClick={() => setShowOrderSetModal(true)}
              className="min-h-[44px]"
            >
              Order Sets
            </Button>
          )}
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditingTask(null); setShowTaskForm(true) }} className="min-h-[44px]">
            Add Task
          </Button>
        </div>
      )}

      {showTaskForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTask ? 'Edit Task' : 'New Task'}</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm
              initialData={editingTask ? { title: editingTask.title, description: editingTask.description || '', category: editingTask.category || 'other', priority: editingTask.priority || 'medium', assignedTo: editingTask.assignedTo || '', dueAt: '', notes: '' } : undefined}
              patientId={id}
              onSubmit={handleTaskSubmit}
              onCancel={() => { setShowTaskForm(false); setEditingTask(null) }}
            />
          </CardContent>
        </Card>
      )}

      {/* Pending tasks */}
      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider">Open ({pendingTasks.length})</h3>
          {pendingTasks.map((task) => (
            <PatientTaskCard
              key={task.id}
              task={task}
              onComplete={() => handleCompleteTask(task.id)}
              onEdit={() => { setEditingTask(task); setShowTaskForm(true) }}
              onDelete={() => handleDeleteTask(task.id)}
              isConfirmingDelete={deletingTaskId === task.id}
              onCancelDelete={cancelDeleteTask}
            />
          ))}
        </div>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wider">Completed ({completedTasks.length})</h3>
          {completedTasks.slice(0, 5).map((task) => (
            <PatientTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {patientTasks.length === 0 && !showTaskForm && (
        <Card className="p-8 text-center">
          <CheckCircle className="h-10 w-10 text-ward-muted mx-auto mb-3" />
          <p className="text-sm text-ward-muted mb-3">No tasks for this patient</p>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowTaskForm(true)} className="min-h-[44px]">
            Create First Task
          </Button>
        </Card>
      )}
    </div>
  )
}

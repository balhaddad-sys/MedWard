import { useState } from 'react'
import { Plus, Filter } from 'lucide-react'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { TaskCard } from './TaskCard'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'

export function TaskList() {
  const getFilteredTasks = useTaskStore((s) => s.getFilteredTasks)
  const tasks = getFilteredTasks()
  const filterStatus = useTaskStore((s) => s.filterStatus)
  const setFilterStatus = useTaskStore((s) => s.setFilterStatus)
  const loading = useTaskStore((s) => s.loading)
  const openModal = useUIStore((s) => s.openModal)

  const allTasks = useTaskStore((s) => s.tasks)
  const pendingCount = allTasks.filter((t) => t.status === 'pending').length
  const inProgressCount = allTasks.filter((t) => t.status === 'in_progress').length
  const completedCount = allTasks.filter((t) => t.status === 'completed').length

  const tabs = [
    { id: 'all', label: 'All', count: allTasks.length },
    { id: 'pending', label: 'Pending', count: pendingCount },
    { id: 'in_progress', label: 'In Progress', count: inProgressCount },
    { id: 'completed', label: 'Done', count: completedCount },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs tabs={tabs} activeTab={filterStatus} onChange={(id) => setFilterStatus(id as typeof filterStatus)} />
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openModal('task-form')}>
          Add Task
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-ward-muted">
          <p className="text-lg font-medium">No tasks found</p>
          <p className="text-sm mt-1">Tasks will appear here when created</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => openModal('task-detail', { taskId: task.id })} />
          ))}
        </div>
      )}
    </div>
  )
}

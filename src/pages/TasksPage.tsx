import { TaskList } from '@/components/features/tasks/TaskList'

export function TasksPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ward-text">Tasks</h1>
        <p className="text-sm text-ward-muted mt-1">Manage and track ward tasks</p>
      </div>
      <TaskList />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { CheckSquare, Clock, AlertTriangle, Plus } from 'lucide-react'
import { TaskList } from '@/components/features/tasks/TaskList'
import { PageHero } from '@/components/ui/PageHero'
import { Button } from '@/components/ui/Button'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'

export function TasksPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const openModal = useUIStore((s) => s.openModal)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const counts = useMemo(() => {
    const open = tasks.filter((t) => (t.status ?? 'pending') !== 'completed' && (t.status ?? 'pending') !== 'cancelled').length
    const critical = tasks.filter((t) => t.priority === 'critical' && (t.status ?? 'pending') !== 'completed' && (t.status ?? 'pending') !== 'cancelled').length
    const dueSoon = tasks.filter((t) => {
      if (!t.dueAt) return false
      const dueDate = t.dueAt.toDate ? t.dueAt.toDate() : new Date(t.dueAt as unknown as string)
      return dueDate.getTime() - nowMs <= 60 * 60 * 1000 && dueDate.getTime() >= nowMs
    }).length
    return { open, critical, dueSoon }
  }, [tasks, nowMs])

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHero
        title="Task Center"
        subtitle="Track open work, prioritize urgent items, and keep handover clean."
        icon={<CheckSquare className="h-5 w-5" />}
        meta={(
          <>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white/90 text-gray-700 border border-gray-200">
              {counts.open} open
            </span>
            {counts.critical > 0 && (
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                {counts.critical} critical
              </span>
            )}
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {counts.dueSoon} due in 1h
            </span>
          </>
        )}
        actions={(
          <Button
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openModal('task-form')}
            className="min-h-[40px]"
          >
            New Task
          </Button>
        )}
      />

      {counts.critical > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Critical tasks are present. Review and escalate immediately where needed.
        </div>
      )}

      <TaskList />
    </div>
  )
}

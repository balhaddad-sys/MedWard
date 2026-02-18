import { useEffect, useMemo, useState } from 'react'
import { CheckSquare, Clock, AlertTriangle, Plus } from 'lucide-react'
import { TaskList } from '@/components/features/tasks/TaskList'
import { Button } from '@/components/ui/Button'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { clsx } from 'clsx'

export function TasksPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const openModal = useUIStore((s) => s.openModal)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const counts = useMemo(() => {
    const open = tasks.filter(
      (t) => (t.status ?? 'pending') !== 'completed' && (t.status ?? 'pending') !== 'cancelled'
    ).length
    const critical = tasks.filter(
      (t) => t.priority === 'critical' &&
        (t.status ?? 'pending') !== 'completed' &&
        (t.status ?? 'pending') !== 'cancelled'
    ).length
    const overdue = tasks.filter((t) => {
      if (!t.dueAt) return false
      const due = t.dueAt.toDate ? t.dueAt.toDate() : new Date(t.dueAt as unknown as string)
      return due.getTime() < nowMs &&
        (t.status ?? 'pending') !== 'completed' &&
        (t.status ?? 'pending') !== 'cancelled'
    }).length
    const dueSoon = tasks.filter((t) => {
      if (!t.dueAt) return false
      const due = t.dueAt.toDate ? t.dueAt.toDate() : new Date(t.dueAt as unknown as string)
      const dueMs = due.getTime()
      return dueMs >= nowMs && dueMs - nowMs <= 60 * 60 * 1000
    }).length
    return { open, critical, overdue, dueSoon }
  }, [tasks, nowMs])

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            Task Center
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {counts.open} open tasks
          </p>
        </div>
        <Button
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => openModal('task-form')}
          className="flex-shrink-0"
        >
          New Task
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-2">
        <StatChip
          label="Open"
          value={counts.open}
          icon={<CheckSquare className="h-4 w-4" />}
          variant={counts.open > 0 ? 'blue' : 'green'}
        />
        <StatChip
          label="Critical"
          value={counts.critical}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={counts.critical > 0 ? 'red' : 'green'}
        />
        <StatChip
          label="Overdue"
          value={counts.overdue}
          icon={<Clock className="h-4 w-4" />}
          variant={counts.overdue > 0 ? 'red' : 'green'}
        />
        <StatChip
          label="Due in 1h"
          value={counts.dueSoon}
          icon={<Clock className="h-4 w-4" />}
          variant={counts.dueSoon > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* Critical alert banner */}
      {counts.critical > 0 && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-red-200 bg-red-50 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">
              {counts.critical} critical task{counts.critical > 1 ? 's' : ''} require immediate attention
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Review and escalate to the responsible clinician if needed.
            </p>
          </div>
        </div>
      )}

      {/* Overdue alert */}
      {counts.overdue > 0 && counts.critical === 0 && (
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-amber-200 bg-amber-50 animate-fade-in">
          <Clock className="h-4 w-4 text-amber-700 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            {counts.overdue} overdue task{counts.overdue > 1 ? 's' : ''} — action required
          </p>
        </div>
      )}

      <TaskList />
    </div>
  )
}

function StatChip({ label, value, icon, variant }: {
  label: string
  value: number
  icon: React.ReactNode
  variant: 'blue' | 'red' | 'amber' | 'green'
}) {
  const styles = {
    blue:  'bg-blue-50 border-blue-200 text-blue-700',
    red:   'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }

  return (
    <div className={clsx(
      'flex flex-col items-center justify-center rounded-2xl p-3 text-center border',
      styles[variant]
    )}>
      <div className="opacity-60 mb-1">{icon}</div>
      <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-60">{label}</p>
    </div>
  )
}

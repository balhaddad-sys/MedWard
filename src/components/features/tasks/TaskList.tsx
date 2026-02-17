import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, User } from 'lucide-react'
import { clsx } from 'clsx'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { usePatientStore } from '@/stores/patientStore'
import { TaskCard } from './TaskCard'
import { Tabs } from '@/components/ui/Tabs'
import type { Task } from '@/types'

interface PatientGroup {
  patientId: string
  patientName: string
  bedNumber: string
  tasks: Task[]
  criticalCount: number
  openCount: number
}

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function groupByPatient(tasks: Task[]): PatientGroup[] {
  const map = new Map<string, PatientGroup>()

  for (const task of tasks) {
    // Group tasks without a valid patient name together under '_unassigned'
    const pid = (task.patientId && task.patientName) ? task.patientId : '_unassigned'
    let group = map.get(pid)
    if (!group) {
      group = {
        patientId: pid,
        patientName: task.patientName || 'Unassigned',
        bedNumber: task.bedNumber || '—',
        tasks: [],
        criticalCount: 0,
        openCount: 0,
      }
      map.set(pid, group)
    }
    group.tasks.push(task)

    const status = task.status ?? 'pending'
    if (status !== 'completed' && status !== 'cancelled') {
      group.openCount++
      if (task.priority === 'critical') group.criticalCount++
    }
  }

  // Sort tasks within each group by priority then due date
  for (const group of map.values()) {
    group.tasks.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority ?? 'medium'] ?? 2
      const pb = PRIORITY_ORDER[b.priority ?? 'medium'] ?? 2
      if (pa !== pb) return pa - pb
      // Then by due date (soonest first)
      const da = a.dueAt ? (a.dueAt.toDate ? a.dueAt.toDate().getTime() : 0) : Infinity
      const db = b.dueAt ? (b.dueAt.toDate ? b.dueAt.toDate().getTime() : 0) : Infinity
      return da - db
    })
  }

  // Sort patient groups: critical tasks first, then by open count, then bed number
  return Array.from(map.values()).sort((a, b) => {
    if (a.criticalCount !== b.criticalCount) return b.criticalCount - a.criticalCount
    if (a.openCount !== b.openCount) return b.openCount - a.openCount
    return (a.bedNumber || '').localeCompare(b.bedNumber || '', undefined, { numeric: true })
  })
}

function PatientSection({ group, openModal }: { group: PatientGroup; openModal: (id: string, data?: Record<string, string>) => void }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
          'hover:bg-gray-50 active:bg-gray-100',
          group.criticalCount > 0 ? 'bg-red-50/60 border border-red-100' : 'bg-gray-50/80 border border-gray-100'
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}

        <div className={clsx(
          'h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0',
          group.criticalCount > 0
            ? 'bg-red-100 text-red-700'
            : group.patientId === '_unassigned' ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700'
        )}>
          {group.patientId === '_unassigned' ? <User className="h-3.5 w-3.5" /> : group.bedNumber}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900 truncate block">
            {group.patientName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {group.criticalCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
              {group.criticalCount} critical
            </span>
          )}
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
            {group.openCount} open
          </span>
        </div>
      </button>

      {!collapsed && (
        <div className="grid gap-2 pl-2">
          {group.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => openModal('task-detail', { taskId: task.id })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function TaskList() {
  const allTasks = useTaskStore((s) => s.tasks)
  const filterStatus = useTaskStore((s) => s.filterStatus)
  const setFilterStatus = useTaskStore((s) => s.setFilterStatus)
  const loading = useTaskStore((s) => s.loading)
  const openModal = useUIStore((s) => s.openModal)
  const patients = usePatientStore((s) => s.patients)

  // Enrich tasks with patient data from store when Firestore fields are missing
  const enrichedTasks = useMemo(() => {
    const patientMap = new Map(patients.map((p) => [p.id, p]))
    return allTasks.map((task) => {
      if (task.patientName && task.bedNumber) return task
      if (!task.patientId) return task
      const patient = patientMap.get(task.patientId)
      if (!patient) return task
      return {
        ...task,
        patientName: task.patientName || `${patient.firstName} ${patient.lastName}`.trim(),
        bedNumber: task.bedNumber || patient.bedNumber || '',
      }
    })
  }, [allTasks, patients])

  const tasks = useMemo(() => {
    if (filterStatus === 'all') return enrichedTasks
    return enrichedTasks.filter((t) => (t.status ?? 'pending') === filterStatus)
  }, [enrichedTasks, filterStatus])

  const patientGroups = useMemo(() => groupByPatient(tasks), [tasks])

  const pendingCount = enrichedTasks.filter((t) => (t.status ?? 'pending') === 'pending').length
  const inProgressCount = enrichedTasks.filter((t) => (t.status ?? 'pending') === 'in_progress').length
  const completedCount = enrichedTasks.filter((t) => (t.status ?? 'pending') === 'completed').length

  const tabs = [
    { id: 'all', label: 'All', count: enrichedTasks.length },
    { id: 'pending', label: 'Pending', count: pendingCount },
    { id: 'in_progress', label: 'In Progress', count: inProgressCount },
    { id: 'completed', label: 'Done', count: completedCount },
  ]

  return (
    <div className="space-y-4">
      <div className="min-w-0 overflow-x-auto">
        <Tabs tabs={tabs} activeTab={filterStatus} onChange={(id) => setFilterStatus(id as typeof filterStatus)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : patientGroups.length === 0 ? (
        <div className="text-center py-12 text-ward-muted">
          <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-lg font-medium">No tasks found</p>
          <p className="text-sm mt-1">Tasks will appear here grouped by patient</p>
        </div>
      ) : (
        <div className="space-y-4">
          {patientGroups.map((group) => (
            <PatientSection key={group.patientId} group={group} openModal={openModal} />
          ))}
        </div>
      )}
    </div>
  )
}

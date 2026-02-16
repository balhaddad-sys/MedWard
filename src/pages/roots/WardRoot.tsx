import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  Plus,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  FlaskConical,
  Edit,
  Trash2,
  X,
  Users,
  Activity,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNowStrict } from 'date-fns'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { triggerHaptic } from '@/utils/haptics'
import { deletePatient } from '@/services/firebase/patients'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { Button } from '@/components/ui/Button'
import { PageHero } from '@/components/ui/PageHero'
import { ACUITY_LEVELS } from '@/config/constants'
import type { Patient, Task } from '@/types'

type ActiveSection = 'patients' | 'tasks' | 'results'
type PatientSort = 'acuity' | 'bed' | 'name' | 'updated'
type PatientFocus = 'all' | 'critical' | 'follow_up' | 'unstable' | 'missing_team'
type TaskFocus = 'all' | 'overdue' | 'due_soon' | 'urgent'

const TASK_PRIORITY_ORDER: Record<Task['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const STATE_STYLES: Record<string, string> = {
  incoming: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  unstable: 'bg-red-100 text-red-700',
  ready_dc: 'bg-amber-100 text-amber-700',
  discharged: 'bg-gray-100 text-gray-600',
}

function naturalCompare(a: string, b: string): number {
  const ax: (string | number)[] = []
  const bx: (string | number)[] = []
  a.replace(/(\d+)|(\D+)/g, (_, n, s) => { ax.push(n ? +n : s); return '' })
  b.replace(/(\d+)|(\D+)/g, (_, n, s) => { bx.push(n ? +n : s); return '' })

  for (let i = 0; i < Math.max(ax.length, bx.length); i++) {
    const ai = ax[i] ?? ''
    const bi = bx[i] ?? ''

    if (typeof ai === 'number' && typeof bi === 'number') {
      if (ai !== bi) return ai - bi
    } else {
      const cmp = String(ai).localeCompare(String(bi))
      if (cmp !== 0) return cmp
    }
  }

  return 0
}

function getWardLabel(wardId: string): string {
  if (!wardId || wardId === 'default') return 'Unassigned'
  return wardId
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate()
  }

  return null
}

function toMs(value: unknown): number | null {
  const date = toDate(value)
  return date ? date.getTime() : null
}

function getTaskDueMeta(task: Task, nowMs: number) {
  const dueAtMs = toMs(task.dueAt)

  if (!dueAtMs) {
    return {
      dueAtMs: null,
      dueLabel: null,
      isOverdue: false,
      isDueSoon: false,
    }
  }

  const deltaMs = dueAtMs - nowMs
  const isOverdue = deltaMs < 0
  const isDueSoon = deltaMs >= 0 && deltaMs <= 2 * 60 * 60 * 1000

  return {
    dueAtMs,
    dueLabel: isOverdue
      ? formatDistanceToNowStrict(dueAtMs, { addSuffix: true })
      : `due ${formatDistanceToNowStrict(dueAtMs, { addSuffix: true })}`,
    isOverdue,
    isDueSoon,
  }
}

function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'
}

export default function WardRoot() {
  const patients = usePatientStore((s) => s.patients)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks = useTaskStore((s) => s.tasks)
  const isMobile = useUIStore((s) => s.isMobile)
  const openModal = useUIStore((s) => s.openModal)
  const addToast = useUIStore((s) => s.addToast)
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterAcuity, setFilterAcuity] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [activeSection, setActiveSection] = useState<ActiveSection>('patients')
  const [collapsedWards, setCollapsedWards] = useState<Set<string>>(new Set())
  const [patientSort, setPatientSort] = useState<PatientSort>('acuity')
  const [patientFocus, setPatientFocus] = useState<PatientFocus>('all')
  const [taskFocus, setTaskFocus] = useState<TaskFocus>('all')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingElement(event.target)) return

      if (event.key === '/') {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        triggerHaptic('tap')
        openModal('patient-form')
        return
      }

      if (event.altKey && event.key.toLowerCase() === 't') {
        event.preventDefault()
        triggerHaptic('tap')
        openModal('task-form')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openModal])

  const criticalPatients = useMemo(
    () => patients.filter((patient) => patient.acuity <= 2),
    [patients]
  )

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  )

  const patientTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {}

    for (const task of tasks) {
      if (task.patientId && (task.status === 'pending' || task.status === 'in_progress')) {
        counts[task.patientId] = (counts[task.patientId] || 0) + 1
      }
    }

    return counts
  }, [tasks])

  const patientsWithCriticals = useMemo(() => {
    const ids = new Set<string>()
    for (const critical of criticalValues) ids.add(critical.patientId)
    return ids
  }, [criticalValues])

  const focusCounts = useMemo(() => {
    let critical = 0
    let followUp = 0
    let unstable = 0
    let missingTeam = 0

    for (const patient of patients) {
      if (patient.acuity <= 2 || patientsWithCriticals.has(patient.id)) critical += 1
      if ((patientTaskCounts[patient.id] || 0) > 0) followUp += 1
      if (patient.state === 'unstable') unstable += 1
      if (!patient.team?.trim() || !patient.attendingPhysician?.trim()) missingTeam += 1
    }

    return {
      all: patients.length,
      critical,
      followUp,
      unstable,
      missingTeam,
    }
  }, [patients, patientsWithCriticals, patientTaskCounts])

  const filteredPatients = useMemo(() => {
    let filtered = [...patients]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (patient) =>
          `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(q) ||
          patient.mrn?.toLowerCase().includes(q) ||
          patient.bedNumber?.toLowerCase().includes(q) ||
          patient.wardId?.toLowerCase().includes(q)
      )
    }

    if (filterAcuity !== null) {
      filtered = filtered.filter((patient) => patient.acuity === filterAcuity)
    }

    if (patientFocus === 'critical') {
      filtered = filtered.filter((patient) => patient.acuity <= 2 || patientsWithCriticals.has(patient.id))
    }

    if (patientFocus === 'follow_up') {
      filtered = filtered.filter((patient) => (patientTaskCounts[patient.id] || 0) > 0)
    }

    if (patientFocus === 'unstable') {
      filtered = filtered.filter((patient) => patient.state === 'unstable')
    }

    if (patientFocus === 'missing_team') {
      filtered = filtered.filter((patient) => !patient.team?.trim() || !patient.attendingPhysician?.trim())
    }

    filtered.sort((a, b) => {
      if (patientSort === 'name') {
        return naturalCompare(`${a.lastName} ${a.firstName}`, `${b.lastName} ${b.firstName}`)
      }

      if (patientSort === 'updated') {
        return (toMs(b.updatedAt) ?? 0) - (toMs(a.updatedAt) ?? 0)
      }

      if (patientSort === 'bed') {
        const wardSort = naturalCompare(getWardLabel(a.wardId), getWardLabel(b.wardId))
        if (wardSort !== 0) return wardSort
        return naturalCompare(a.bedNumber || '', b.bedNumber || '')
      }

      if (a.acuity !== b.acuity) return a.acuity - b.acuity
      if (patientsWithCriticals.has(a.id) !== patientsWithCriticals.has(b.id)) {
        return patientsWithCriticals.has(a.id) ? -1 : 1
      }
      return naturalCompare(a.bedNumber || '', b.bedNumber || '')
    })

    return filtered
  }, [patients, searchQuery, filterAcuity, patientFocus, patientSort, patientsWithCriticals, patientTaskCounts])

  const patientsByWard = useMemo(() => {
    const groups = new Map<string, Patient[]>()

    for (const patient of filteredPatients) {
      const key = getWardLabel(patient.wardId)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(patient)
    }

    return [...groups.entries()].sort((a, b) => {
      if (a[0] === 'Unassigned') return 1
      if (b[0] === 'Unassigned') return -1
      return naturalCompare(a[0], b[0])
    })
  }, [filteredPatients])

  const pendingTasks = useMemo(
    () => tasks.filter((task) => task.status === 'pending' || task.status === 'in_progress'),
    [tasks]
  )

  const urgentTasks = useMemo(
    () => pendingTasks.filter((task) => task.priority === 'critical' || task.priority === 'high'),
    [pendingTasks]
  )

  const sortedPendingTasks = useMemo(() => {
    return [...pendingTasks].sort((a, b) => {
      const aMeta = getTaskDueMeta(a, nowMs)
      const bMeta = getTaskDueMeta(b, nowMs)

      if (aMeta.isOverdue !== bMeta.isOverdue) return aMeta.isOverdue ? -1 : 1
      if (aMeta.isDueSoon !== bMeta.isDueSoon) return aMeta.isDueSoon ? -1 : 1

      const aPriority = TASK_PRIORITY_ORDER[a.priority] ?? 99
      const bPriority = TASK_PRIORITY_ORDER[b.priority] ?? 99
      if (aPriority !== bPriority) return aPriority - bPriority

      if (aMeta.dueAtMs && bMeta.dueAtMs) return aMeta.dueAtMs - bMeta.dueAtMs
      if (aMeta.dueAtMs) return -1
      if (bMeta.dueAtMs) return 1

      return (toMs(b.updatedAt) ?? 0) - (toMs(a.updatedAt) ?? 0)
    })
  }, [pendingTasks, nowMs])

  const overdueTasks = useMemo(
    () => sortedPendingTasks.filter((task) => getTaskDueMeta(task, nowMs).isOverdue),
    [sortedPendingTasks, nowMs]
  )

  const dueSoonTasks = useMemo(
    () => sortedPendingTasks.filter((task) => getTaskDueMeta(task, nowMs).isDueSoon),
    [sortedPendingTasks, nowMs]
  )

  const focusedTasks = useMemo(() => {
    if (taskFocus === 'overdue') return overdueTasks
    if (taskFocus === 'due_soon') return dueSoonTasks
    if (taskFocus === 'urgent') {
      return sortedPendingTasks.filter((task) => task.priority === 'critical' || task.priority === 'high')
    }
    return sortedPendingTasks
  }, [taskFocus, overdueTasks, dueSoonTasks, sortedPendingTasks])

  const urgentTaskIds = useMemo(
    () => new Set(urgentTasks.map((task) => task.id)),
    [urgentTasks]
  )

  const overdueTaskIds = useMemo(
    () => new Set(overdueTasks.map((task) => task.id)),
    [overdueTasks]
  )

  const completedToday = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return tasks.filter((task) => {
      if (task.status !== 'completed' || !task.completedAt) return false
      const completed = task.completedAt.toDate
        ? task.completedAt.toDate()
        : new Date(task.completedAt as unknown as string)
      return completed >= today
    })
  }, [tasks])

  const rapidRoundQueue = useMemo(() => {
    const ranked = filteredPatients
      .map((patient) => {
        let score = 0
        if (patientsWithCriticals.has(patient.id)) score += 110
        if (patient.acuity <= 2) score += 80
        if (patient.state === 'unstable') score += 60
        score += Math.min((patientTaskCounts[patient.id] || 0) * 6, 24)
        return { patient, score }
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)

    return ranked.map((entry) => entry.patient)
  }, [filteredPatients, patientsWithCriticals, patientTaskCounts])

  const toggleWard = useCallback((wardName: string) => {
    triggerHaptic('tap')
    setCollapsedWards((prev) => {
      const next = new Set(prev)
      if (next.has(wardName)) next.delete(wardName)
      else next.add(wardName)
      return next
    })
  }, [])

  const handleEditPatient = useCallback((patient: Patient) => {
    triggerHaptic('tap')
    openModal('patient-form', {
      patientId: patient.id,
      initialData: {
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        wardId: patient.wardId,
        bedNumber: patient.bedNumber,
        acuity: patient.acuity,
        primaryDiagnosis: patient.primaryDiagnosis,
        diagnoses: patient.diagnoses,
        allergies: patient.allergies,
        codeStatus: patient.codeStatus,
        attendingPhysician: patient.attendingPhysician,
        team: patient.team,
      },
    })
  }, [openModal])

  const handleDeletePatient = useCallback(async (patientId: string) => {
    try {
      await deletePatient(patientId)
      triggerHaptic('tap')
      addToast({ type: 'success', title: 'Patient deleted' })
    } catch (error) {
      console.error('Delete patient failed:', error)
      addToast({
        type: 'error',
        title: 'Failed to delete patient',
        message: 'Check permissions or try again.',
      })
    }
  }, [addToast])

  const renderPatientsSection = () => (
    <div className="space-y-3">
      <section className="rounded-xl border border-ward-border bg-white p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ward-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, MRN, bed, or ward..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="input-field pl-9 pr-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ward-muted hover:text-ward-text"
                aria-label="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              triggerHaptic('tap')
              setShowFilters(!showFilters)
            }}
            className={clsx(
              'p-2.5 rounded-lg border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch',
              showFilters
                ? 'border-primary-300 bg-primary-50 text-primary-600'
                : 'border-ward-border text-ward-muted hover:bg-gray-50'
            )}
            aria-label="Toggle filters"
          >
            <Filter className="h-4 w-4" />
          </button>

          <button
            onClick={() => {
              triggerHaptic('tap')
              openModal('patient-form')
            }}
            className="p-2.5 rounded-lg bg-primary-600 text-white min-h-[44px] min-w-[44px] flex items-center justify-center touch hover:bg-primary-700"
            aria-label="Add patient"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[170px]">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ward-muted" />
            <select
              value={patientSort}
              onChange={(event) => setPatientSort(event.target.value as PatientSort)}
              className="input-field pl-8 pr-8 py-2 text-xs"
              aria-label="Sort patients"
            >
              <option value="acuity">Sort: Acuity first</option>
              <option value="bed">Sort: Ward and bed</option>
              <option value="name">Sort: Last name</option>
              <option value="updated">Sort: Recently updated</option>
            </select>
          </div>

          {patientsByWard.length > 1 && (
            <>
              <button
                onClick={() => setCollapsedWards(new Set())}
                className="px-2.5 py-1.5 rounded-lg border border-ward-border bg-white text-xs font-medium text-ward-muted hover:text-ward-text hover:bg-gray-50 transition-colors"
              >
                Expand all wards
              </button>
              <button
                onClick={() => setCollapsedWards(new Set(patientsByWard.map(([ward]) => ward)))}
                className="px-2.5 py-1.5 rounded-lg border border-ward-border bg-white text-xs font-medium text-ward-muted hover:text-ward-text hover:bg-gray-50 transition-colors"
              >
                Collapse all wards
              </button>
            </>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: 'all' as const, label: 'All', count: focusCounts.all },
            { id: 'critical' as const, label: 'Critical', count: focusCounts.critical },
            { id: 'follow_up' as const, label: 'Follow-up', count: focusCounts.followUp },
            { id: 'unstable' as const, label: 'Unstable', count: focusCounts.unstable },
            { id: 'missing_team' as const, label: 'Missing Team', count: focusCounts.missingTeam },
          ].map((focus) => (
            <button
              key={focus.id}
              onClick={() => {
                triggerHaptic('tap')
                setPatientFocus(focus.id)
              }}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px]',
                patientFocus === focus.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {focus.label}
              <span className={clsx('ml-1.5 text-[10px] font-bold', patientFocus === focus.id ? 'text-white/80' : 'text-gray-500')}>
                {focus.count}
              </span>
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="flex gap-1.5 flex-wrap pt-1">
            {[null, 1, 2, 3, 4, 5].map((acuity) => (
              <button
                key={String(acuity)}
                onClick={() => {
                  triggerHaptic('tap')
                  setFilterAcuity(acuity)
                }}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px]',
                  filterAcuity === acuity
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {acuity === null ? 'All acuity' : ACUITY_LEVELS[acuity as keyof typeof ACUITY_LEVELS]?.label ?? `Acuity ${acuity}`}
              </button>
            ))}
          </div>
        )}
      </section>

      {filteredPatients.length > 0 && (
        <div className="flex items-center justify-between text-xs text-ward-muted">
          <span>
            {filteredPatients.length} {filteredPatients.length === 1 ? 'patient' : 'patients'} across {patientsByWard.length} {patientsByWard.length === 1 ? 'ward' : 'wards'}
            {(searchQuery || filterAcuity !== null || patientFocus !== 'all') && ' matching filters'}
          </span>
          <div className="flex items-center gap-2">
            {!isMobile && (
              <span className="hidden md:inline text-[11px]">
                Shortcuts: <kbd className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200">/</kbd> search, <kbd className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200">Alt+N</kbd> patient, <kbd className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200">Alt+T</kbd> task
              </span>
            )}
            {(searchQuery || filterAcuity !== null || patientFocus !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterAcuity(null)
                  setPatientFocus('all')
                  setShowFilters(false)
                }}
                className="text-primary-600 font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {filteredPatients.length === 0 ? (
        <div className="text-center py-12 text-ward-muted rounded-xl border border-dashed border-ward-border bg-white">
          {searchQuery || filterAcuity !== null || patientFocus !== 'all' ? (
            <>
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No patients match current filters</p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterAcuity(null)
                  setPatientFocus('all')
                  setShowFilters(false)
                }}
                className="text-xs text-primary-600 font-medium mt-1"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <Plus className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No patients on the ward</p>
              <button
                onClick={() => {
                  triggerHaptic('tap')
                  openModal('patient-form')
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 mt-3 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" /> Add Patient
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {patientsByWard.map(([wardName, wardPatients]) => {
            const isCollapsed = collapsedWards.has(wardName)
            const wardTaskCount = wardPatients.reduce((total, patient) => total + (patientTaskCounts[patient.id] || 0), 0)
            const wardCriticalCount = wardPatients.filter((patient) => patientsWithCriticals.has(patient.id) || patient.acuity <= 2).length

            return (
              <div key={wardName} className="border border-ward-border rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => toggleWard(wardName)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors touch"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-ward-muted flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-ward-muted flex-shrink-0" />
                  )}
                  <span className="text-sm font-bold text-ward-text">{wardName}</span>
                  <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                    {wardPatients.length}
                  </span>
                  {wardTaskCount > 0 && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {wardTaskCount} tasks
                    </span>
                  )}
                  {wardCriticalCount > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {wardCriticalCount} watch
                    </span>
                  )}
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-gray-100">
                    {wardPatients.map((patient) => (
                      <WardPatientRow
                        key={patient.id}
                        patient={patient}
                        taskCount={patientTaskCounts[patient.id] || 0}
                        hasCritical={patientsWithCriticals.has(patient.id)}
                        onTap={() => {
                          triggerHaptic('tap')
                          navigate(`/patients/${patient.id}`)
                        }}
                        onEdit={() => handleEditPatient(patient)}
                        onDelete={() => handleDeletePatient(patient.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderTasksSection = (compact = false) => (
    <div className="space-y-3">
      <div className="rounded-xl border border-ward-border bg-white p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Operational Task View
          </h3>
          <Button
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => {
              triggerHaptic('tap')
              openModal('task-form')
            }}
            className="min-h-[36px]"
          >
            Add Task
          </Button>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: 'all' as const, label: 'All', count: pendingTasks.length },
            { id: 'overdue' as const, label: 'Overdue', count: overdueTasks.length },
            { id: 'due_soon' as const, label: 'Due Soon', count: dueSoonTasks.length },
            { id: 'urgent' as const, label: 'Urgent', count: urgentTasks.length },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                triggerHaptic('tap')
                setTaskFocus(filter.id)
              }}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[34px]',
                taskFocus === filter.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {filter.label}
              <span className={clsx('ml-1.5 text-[10px] font-bold', taskFocus === filter.id ? 'text-white/80' : 'text-gray-500')}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {focusedTasks.length === 0 ? (
          <div className="text-center py-8 text-ward-muted rounded-xl border border-ward-border bg-white">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No tasks in this focus view</p>
          </div>
        ) : (
          focusedTasks.slice(0, compact ? 12 : 36).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              variant={overdueTaskIds.has(task.id) || urgentTaskIds.has(task.id) ? 'urgent' : 'normal'}
              patientMap={patientById}
              nowMs={nowMs}
            />
          ))
        )}
      </div>

      {!compact && completedToday.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Done Today ({completedToday.length})
          </h3>
          <div className="space-y-1">
            {completedToday.slice(0, 12).map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                variant="completed"
                patientMap={patientById}
                nowMs={nowMs}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderResultsSection = (compact = false) => (
    <div className="space-y-3">
      <div className="rounded-xl border border-ward-border bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider flex items-center gap-1">
            <FlaskConical className="h-3.5 w-3.5" /> Results Follow-Up
          </h3>
          <button
            onClick={() => navigate('/labs')}
            className="text-xs text-primary-600 font-medium touch"
          >
            View all labs
          </button>
        </div>
      </div>

      {criticalValues.length > 0 ? (
        <div className="space-y-1.5">
          {criticalValues.slice(0, compact ? 8 : 24).map((critical, index) => {
            const patient = patientById.get(critical.patientId)
            return (
              <button
                key={`${critical.patientId}-${critical.labName}-${index}`}
                onClick={() => {
                  triggerHaptic('tap')
                  navigate(`/patients/${critical.patientId}`)
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-left touch"
              >
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800 truncate">
                    {critical.labName}: {critical.value} {critical.unit}
                  </p>
                  <p className="text-xs text-red-600 truncate">
                    {patient ? `Bed ${patient.bedNumber} · ${patient.lastName}, ${patient.firstName}` : 'Unknown patient'}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-red-600 uppercase px-2 py-0.5 bg-red-100 rounded-full border border-red-200 flex-shrink-0">
                  {critical.flag === 'critical_high' ? 'HIGH' : 'LOW'}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-ward-muted rounded-xl border border-ward-border bg-white">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40 text-green-400" />
          <p className="text-sm font-medium text-green-600">No critical values</p>
          <p className="text-xs mt-1">All recent results are within alert thresholds.</p>
        </div>
      )}

      {!compact && (
        <button
          onClick={() => {
            triggerHaptic('tap')
            navigate('/handover')
          }}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-ward-border bg-white hover:bg-gray-50 transition-colors touch"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-ward-text">Generate Handover</p>
              <p className="text-xs text-ward-muted">Build structured SBAR output with current priorities</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-ward-muted" />
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHero
        title="Ward Dashboard"
        subtitle="Prioritize by risk, move quickly between patient actions, and keep operational flow visible."
        icon={<Users className="h-5 w-5" />}
        meta={(
          <>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white/90 text-gray-700 border border-gray-200">
              {patients.length} patients
            </span>
            {criticalPatients.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                {criticalPatients.length} critical
              </span>
            )}
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              {urgentTasks.length} urgent tasks
            </span>
            {overdueTasks.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                {overdueTasks.length} overdue
              </span>
            )}
          </>
        )}
        actions={(
          <>
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                triggerHaptic('tap')
                openModal('patient-form')
              }}
              className="min-h-[40px]"
            >
              Add Patient
            </Button>
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                triggerHaptic('tap')
                openModal('task-form')
              }}
              className="min-h-[40px]"
            >
              Add Task
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <StatCard icon={<Users className="h-4 w-4" />} label="Census" value={patients.length} color="blue" />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Critical" value={criticalPatients.length} color={criticalPatients.length > 0 ? 'red' : 'green'} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Open Tasks" value={pendingTasks.length} color={pendingTasks.length > 0 ? 'amber' : 'green'} />
        <StatCard icon={<AlertCircle className="h-4 w-4" />} label="Overdue" value={overdueTasks.length} color={overdueTasks.length > 0 ? 'red' : 'green'} />
        <StatCard icon={<Activity className="h-4 w-4" />} label="Lab Flags" value={criticalValues.length} color={criticalValues.length > 0 ? 'red' : 'green'} />
      </div>

      {rapidRoundQueue.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <h2 className="text-sm font-semibold text-amber-800">Rapid Round Queue</h2>
            </div>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white border border-amber-200 text-amber-700">
              {rapidRoundQueue.length} prioritized
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {rapidRoundQueue.map((patient) => (
              <button
                key={patient.id}
                onClick={() => navigate(`/patients/${patient.id}`)}
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-left hover:bg-amber-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-amber-900 truncate">
                    Bed {patient.bedNumber || '?'} · {patient.lastName}, {patient.firstName}
                  </p>
                  <ChevronRight className="h-4 w-4 text-amber-500 flex-shrink-0" />
                </div>
                <p className="text-xs text-amber-700 truncate">
                  {patient.primaryDiagnosis || 'No diagnosis documented'}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {criticalValues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Critical Values ({criticalValues.length})</span>
          </div>
          <div className="space-y-1">
            {criticalValues.slice(0, 5).map((critical, index) => {
              const patient = patientById.get(critical.patientId)
              return (
                <button
                  key={`${critical.patientId}-${critical.labName}-${index}`}
                  onClick={() => navigate(`/patients/${critical.patientId}`)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors text-xs"
                >
                  <span className="font-bold text-red-700 w-12 flex-shrink-0">Bed {patient?.bedNumber || '?'}</span>
                  <span className="text-red-800 font-medium truncate">{patient?.lastName}, {patient?.firstName}</span>
                  <span className="text-red-600 ml-auto flex-shrink-0 font-mono">{critical.labName}: {critical.value} {critical.unit}</span>
                </button>
              )
            })}
            {criticalValues.length > 5 && (
              <p className="text-[10px] text-red-500 text-center pt-1">+{criticalValues.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {isMobile ? (
        <>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { id: 'patients' as const, label: 'Patients', count: filteredPatients.length },
              { id: 'tasks' as const, label: 'Tasks', count: pendingTasks.length },
              { id: 'results' as const, label: 'Results', count: criticalValues.length },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic('tap')
                  setActiveSection(tab.id)
                }}
                className={clsx(
                  'flex-1 py-2 px-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors touch',
                  activeSection === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={clsx('ml-1.5 text-[10px] font-bold', tab.id === 'results' && criticalValues.length > 0 ? 'text-red-500' : 'opacity-70')}>
                    ({tab.count})
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeSection === 'patients' && renderPatientsSection()}
          {activeSection === 'tasks' && renderTasksSection(false)}
          {activeSection === 'results' && renderResultsSection(false)}
        </>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8">{renderPatientsSection()}</div>
          <div className="xl:col-span-4 space-y-4 xl:sticky xl:top-4 self-start">
            {renderTasksSection(true)}
            {renderResultsSection(true)}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number; sub?: string; color: 'blue' | 'red' | 'amber' | 'green' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
  }

  return (
    <div className={clsx('rounded-xl p-2.5 text-center', colors[color])}>
      <div className="flex items-center justify-center mb-1 opacity-70">{icon}</div>
      <p className="text-lg font-bold font-mono leading-none">
        {value}
        {sub && <span className="text-xs opacity-60">{sub}</span>}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5 opacity-70">{label}</p>
    </div>
  )
}

function WardPatientRow({ patient, taskCount, hasCritical, onTap, onEdit, onDelete }: { patient: Patient; taskCount: number; hasCritical: boolean; onTap: () => void; onEdit: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const acuityColor = patient.acuity <= 2 ? 'bg-red-500' : patient.acuity === 3 ? 'bg-yellow-500' : 'bg-green-500'
  const stateClass = STATE_STYLES[patient.state] || STATE_STYLES.active

  const rightActions = confirming
    ? [
      { label: 'Cancel', icon: <X className="h-4 w-4" />, color: 'bg-gray-500', onClick: () => setConfirming(false) },
      { label: 'Confirm', icon: <Trash2 className="h-4 w-4" />, color: 'bg-red-600', onClick: () => { onDelete(); setConfirming(false) } },
    ]
    : [
      { label: 'Edit', icon: <Edit className="h-4 w-4" />, color: 'bg-blue-500', onClick: onEdit },
      { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, color: 'bg-red-500', onClick: () => setConfirming(true) },
    ]

  return (
    <SwipeableRow rightActions={rightActions}>
      <button onClick={onTap} className={clsx('w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 transition-all text-left touch', hasCritical && 'bg-red-50/30')}>
        <div className={clsx('h-2.5 w-2.5 rounded-full flex-shrink-0', acuityColor)} />
        <div className="w-10 text-xs font-mono font-bold text-ward-text flex-shrink-0">{patient.bedNumber || '—'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-ward-text truncate">
              {patient.lastName?.toUpperCase()}
              {patient.firstName && `, ${patient.firstName}`}
            </p>
            <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase', stateClass)}>
              {patient.state || 'active'}
            </span>
            {hasCritical && <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-ward-muted truncate">{patient.primaryDiagnosis || 'No diagnosis'}</p>
          <p className="text-[11px] text-ward-muted truncate">
            {patient.team || 'No team'}{patient.attendingPhysician ? ` · Dr. ${patient.attendingPhysician}` : ' · Attending not set'}
          </p>
          {patient.allergies && patient.allergies.length > 0 && (
            <p className="text-[10px] text-red-600 font-medium truncate">Allergy: {patient.allergies.join(', ')}</p>
          )}
        </div>
        {patient.codeStatus && patient.codeStatus !== 'full' && (
          <span className="flex-shrink-0 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase">
            {patient.codeStatus}
          </span>
        )}
        {taskCount > 0 && (
          <span className="flex-shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
            {taskCount}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-ward-muted flex-shrink-0" />
      </button>
    </SwipeableRow>
  )
}

function TaskRow({
  task,
  variant,
  patientMap,
  nowMs,
}: {
  task: Task
  variant: 'urgent' | 'normal' | 'completed'
  patientMap: Map<string, Patient>
  nowMs: number
}) {
  const navigate = useNavigate()
  const patient = patientMap.get(task.patientId)
  const dueMeta = getTaskDueMeta(task, nowMs)
  const priorityColors: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  }

  return (
    <button
      onClick={() => {
        triggerHaptic('tap')
        if (task.patientId) navigate(`/patients/${task.patientId}`)
      }}
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left touch',
        variant === 'urgent'
          ? 'bg-red-50 border-red-200 hover:bg-red-100'
          : variant === 'completed'
            ? 'bg-gray-50 border-gray-200 opacity-70'
            : 'bg-white border-ward-border hover:bg-gray-50'
      )}
    >
      <div className={clsx('h-2 w-2 rounded-full flex-shrink-0', variant === 'completed' ? 'bg-green-500' : priorityColors[task.priority] || 'bg-gray-400')} />
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium truncate', variant === 'completed' ? 'text-gray-500 line-through' : 'text-ward-text')}>
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <p className="text-ward-muted truncate">
            {patient ? `Bed ${patient.bedNumber} · ${patient.lastName}, ${patient.firstName}` : task.patientName || 'Unassigned'}
          </p>
          {dueMeta.dueLabel && (
            <span className={clsx('font-medium', dueMeta.isOverdue ? 'text-red-600' : dueMeta.isDueSoon ? 'text-amber-700' : 'text-ward-muted')}>
              {dueMeta.isOverdue ? `Overdue ${dueMeta.dueLabel}` : dueMeta.dueLabel}
            </span>
          )}
        </div>
      </div>
      {variant !== 'completed' && (
        <span className={clsx('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0', task.priority === 'critical' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600')}>
          {task.priority}
        </span>
      )}
    </button>
  )
}

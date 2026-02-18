import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, ChevronRight, ChevronDown,
  AlertTriangle, CheckCircle2, Clock, FlaskConical,
  Edit, Trash2, X, Users, Activity, AlertCircle,
  ArrowUpDown, Filter,
} from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNowStrict } from 'date-fns'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { triggerHaptic } from '@/utils/haptics'
import { deletePatient } from '@/services/firebase/patients'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { ACUITY_LEVELS } from '@/config/constants'
import type { Patient, Task } from '@/types'

type ActiveSection = 'patients' | 'tasks' | 'results'
type PatientSort = 'acuity' | 'bed' | 'name' | 'updated'
type PatientFocus = 'all' | 'critical' | 'follow_up' | 'unstable' | 'missing_team'
type TaskFocus = 'all' | 'overdue' | 'due_soon' | 'urgent'

const TASK_PRIORITY_ORDER: Record<Task['priority'], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
}

const STATE_CHIP_CLASS: Record<string, string> = {
  incoming:  'state-incoming',
  active:    'state-active',
  unstable:  'state-unstable',
  ready_dc:  'state-ready-dc',
  discharged:'state-discharged',
}

function naturalCompare(a: string, b: string): number {
  const ax: (string | number)[] = []
  const bx: (string | number)[] = []
  a.replace(/(\d+)|(\D+)/g, (_, n, s) => { ax.push(n ? +n : s); return '' })
  b.replace(/(\d+)|(\D+)/g, (_, n, s) => { bx.push(n ? +n : s); return '' })
  for (let i = 0; i < Math.max(ax.length, bx.length); i++) {
    const ai = ax[i] ?? ''; const bi = bx[i] ?? ''
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
  return (!wardId || wardId === 'default') ? 'Unassigned' : wardId
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  return null
}

function toMs(value: unknown): number | null {
  const d = toDate(value); return d ? d.getTime() : null
}

function getTaskDueMeta(task: Task, nowMs: number) {
  const dueAtMs = toMs(task.dueAt)
  if (!dueAtMs) return { dueAtMs: null, dueLabel: null, isOverdue: false, isDueSoon: false }
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

// ─── Stat Tile ─────────────────────────────────────────────────────────────

function StatTile({ icon, label, value, variant = 'neutral' }: {
  icon: React.ReactNode
  label: string
  value: number
  variant?: 'neutral' | 'red' | 'amber' | 'green' | 'blue'
}) {
  const styles = {
    neutral: 'bg-white border-gray-200 text-gray-700',
    red:     'bg-red-50 border-red-200 text-red-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    green:   'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue:    'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <div className={clsx('flex flex-col items-center justify-center rounded-2xl p-3 text-center border', styles[variant])}>
      <div className="opacity-60 mb-1">{icon}</div>
      <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-60">{label}</p>
    </div>
  )
}

// ─── Patient Row ────────────────────────────────────────────────────────────

function WardPatientRow({
  patient, taskCount, hasCritical, onTap, onEdit, onDelete,
}: {
  patient: Patient
  taskCount: number
  hasCritical: boolean
  onTap: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  const acuityDotClass =
    patient.acuity <= 2 ? 'bg-red-500' :
    patient.acuity === 3 ? 'bg-amber-500' : 'bg-emerald-500'

  const rightActions = confirming
    ? [
        { label: 'Cancel',  icon: <X className="h-4 w-4" />,     color: 'bg-gray-500', onClick: () => setConfirming(false) },
        { label: 'Confirm', icon: <Trash2 className="h-4 w-4" />, color: 'bg-red-600',  onClick: () => { onDelete(); setConfirming(false) } },
      ]
    : [
        { label: 'Edit',   icon: <Edit className="h-4 w-4" />,   color: 'bg-blue-500', onClick: onEdit },
        { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, color: 'bg-red-500',  onClick: () => setConfirming(true) },
      ]

  const stateChip = STATE_CHIP_CLASS[patient.state] ?? STATE_CHIP_CLASS.active

  return (
    <SwipeableRow rightActions={rightActions}>
      <button
        onClick={onTap}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-3 bg-white hover:bg-gray-50 active:bg-gray-100',
          'transition-colors duration-100 text-left touch',
          hasCritical && 'bg-red-50/40 hover:bg-red-50/60'
        )}
      >
        {/* Acuity dot */}
        <div className={clsx('h-2.5 w-2.5 rounded-full flex-shrink-0', acuityDotClass)} />

        {/* Bed */}
        <div className="w-10 text-xs font-mono font-bold text-gray-800 flex-shrink-0 text-center">
          {patient.bedNumber || '—'}
        </div>

        {/* Patient info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-gray-900 truncate">
              {patient.lastName?.toUpperCase()}
              {patient.firstName && `, ${patient.firstName}`}
            </p>
            <span className={stateChip}>{patient.state || 'active'}</span>
            {hasCritical && (
              <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
            )}
            {patient.codeStatus && patient.codeStatus !== 'full' && (
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase">
                {patient.codeStatus}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {patient.primaryDiagnosis || 'No diagnosis'}
          </p>
          <p className="text-[11px] text-gray-400 truncate">
            {patient.team || 'No team'}
            {patient.attendingPhysician ? ` · Dr. ${patient.attendingPhysician}` : ''}
          </p>
          {patient.allergies && patient.allergies.length > 0 && (
            <p className="text-[10px] text-red-600 font-semibold truncate">
              ⚠ {patient.allergies.join(', ')}
            </p>
          )}
        </div>

        {/* Task badge */}
        {taskCount > 0 && (
          <span className="flex-shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold border border-amber-200">
            {taskCount}
          </span>
        )}

        <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
      </button>
    </SwipeableRow>
  )
}

// ─── Task Row ────────────────────────────────────────────────────────────────

function TaskRow({
  task, variant, patientMap, nowMs,
}: {
  task: Task
  variant: 'urgent' | 'normal' | 'completed'
  patientMap: Map<string, Patient>
  nowMs: number
}) {
  const navigate = useNavigate()
  const patient = patientMap.get(task.patientId)
  const dueMeta = getTaskDueMeta(task, nowMs)

  const priorityDot: Record<string, string> = {
    critical: 'bg-red-500',
    high:     'bg-orange-500',
    medium:   'bg-amber-400',
    low:      'bg-emerald-500',
  }

  const priorityBadge: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high:     'bg-orange-100 text-orange-700 border-orange-200',
    medium:   'bg-amber-100 text-amber-700 border-amber-200',
    low:      'bg-gray-100 text-gray-600 border-gray-200',
  }

  return (
    <button
      onClick={() => { triggerHaptic('tap'); if (task.patientId) navigate(`/patients/${task.patientId}`) }}
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left touch',
        variant === 'urgent'    && 'bg-red-50 border-red-200 hover:bg-red-100',
        variant === 'completed' && 'bg-gray-50 border-gray-200 opacity-60',
        variant === 'normal'    && 'bg-white border-gray-200 hover:bg-gray-50'
      )}
    >
      <div className={clsx(
        'h-2 w-2 rounded-full flex-shrink-0',
        variant === 'completed' ? 'bg-emerald-500' : priorityDot[task.priority] ?? 'bg-gray-400'
      )} />

      <div className="flex-1 min-w-0">
        <p className={clsx(
          'text-sm font-semibold truncate',
          variant === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'
        )}>
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 text-xs">
          <span className="text-gray-500 truncate">
            {patient
              ? `Bed ${patient.bedNumber} · ${patient.lastName}, ${patient.firstName}`
              : task.patientName || 'Unassigned'}
          </span>
          {dueMeta.dueLabel && (
            <span className={clsx(
              'font-semibold',
              dueMeta.isOverdue ? 'text-red-600' : dueMeta.isDueSoon ? 'text-amber-700' : 'text-gray-400'
            )}>
              {dueMeta.isOverdue ? `Overdue ${dueMeta.dueLabel}` : dueMeta.dueLabel}
            </span>
          )}
        </div>
      </div>

      {variant !== 'completed' && (
        <span className={clsx(
          'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 border',
          priorityBadge[task.priority] ?? 'bg-gray-100 text-gray-600 border-gray-200'
        )}>
          {task.priority}
        </span>
      )}
    </button>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingElement(e.target)) return
      if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus(); return }
      if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); triggerHaptic('tap'); openModal('patient-form'); return }
      if (e.altKey && e.key.toLowerCase() === 't') { e.preventDefault(); triggerHaptic('tap'); openModal('task-form') }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openModal])

  const criticalPatients = useMemo(() => patients.filter((p) => p.acuity <= 2), [patients])
  const patientById = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients])

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
    for (const c of criticalValues) ids.add(c.patientId)
    return ids
  }, [criticalValues])

  const focusCounts = useMemo(() => {
    let critical = 0, followUp = 0, unstable = 0, missingTeam = 0
    for (const p of patients) {
      if (p.acuity <= 2 || patientsWithCriticals.has(p.id)) critical++
      if ((patientTaskCounts[p.id] || 0) > 0) followUp++
      if (p.state === 'unstable') unstable++
      if (!p.team?.trim() || !p.attendingPhysician?.trim()) missingTeam++
    }
    return { all: patients.length, critical, followUp, unstable, missingTeam }
  }, [patients, patientsWithCriticals, patientTaskCounts])

  const filteredPatients = useMemo(() => {
    let filtered = [...patients]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.mrn?.toLowerCase().includes(q) ||
        p.bedNumber?.toLowerCase().includes(q) ||
        p.wardId?.toLowerCase().includes(q)
      )
    }
    if (filterAcuity !== null) filtered = filtered.filter((p) => p.acuity === filterAcuity)
    if (patientFocus === 'critical')      filtered = filtered.filter((p) => p.acuity <= 2 || patientsWithCriticals.has(p.id))
    if (patientFocus === 'follow_up')     filtered = filtered.filter((p) => (patientTaskCounts[p.id] || 0) > 0)
    if (patientFocus === 'unstable')      filtered = filtered.filter((p) => p.state === 'unstable')
    if (patientFocus === 'missing_team')  filtered = filtered.filter((p) => !p.team?.trim() || !p.attendingPhysician?.trim())

    filtered.sort((a, b) => {
      if (patientSort === 'name') return naturalCompare(`${a.lastName} ${a.firstName}`, `${b.lastName} ${b.firstName}`)
      if (patientSort === 'updated') return (toMs(b.updatedAt) ?? 0) - (toMs(a.updatedAt) ?? 0)
      if (patientSort === 'bed') {
        const ws = naturalCompare(getWardLabel(a.wardId), getWardLabel(b.wardId))
        if (ws !== 0) return ws
        return naturalCompare(a.bedNumber || '', b.bedNumber || '')
      }
      if (a.acuity !== b.acuity) return a.acuity - b.acuity
      if (patientsWithCriticals.has(a.id) !== patientsWithCriticals.has(b.id))
        return patientsWithCriticals.has(a.id) ? -1 : 1
      return naturalCompare(a.bedNumber || '', b.bedNumber || '')
    })
    return filtered
  }, [patients, searchQuery, filterAcuity, patientFocus, patientSort, patientsWithCriticals, patientTaskCounts])

  const patientsByWard = useMemo(() => {
    const groups = new Map<string, Patient[]>()
    for (const p of filteredPatients) {
      const key = getWardLabel(p.wardId)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }
    return [...groups.entries()].sort((a, b) => {
      if (a[0] === 'Unassigned') return 1
      if (b[0] === 'Unassigned') return -1
      return naturalCompare(a[0], b[0])
    })
  }, [filteredPatients])

  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress'), [tasks])
  const urgentTasks  = useMemo(() => pendingTasks.filter((t) => t.priority === 'critical' || t.priority === 'high'), [pendingTasks])

  const sortedPendingTasks = useMemo(() => [...pendingTasks].sort((a, b) => {
    const am = getTaskDueMeta(a, nowMs); const bm = getTaskDueMeta(b, nowMs)
    if (am.isOverdue !== bm.isOverdue) return am.isOverdue ? -1 : 1
    if (am.isDueSoon !== bm.isDueSoon) return am.isDueSoon ? -1 : 1
    const ap = TASK_PRIORITY_ORDER[a.priority] ?? 99; const bp = TASK_PRIORITY_ORDER[b.priority] ?? 99
    if (ap !== bp) return ap - bp
    if (am.dueAtMs && bm.dueAtMs) return am.dueAtMs - bm.dueAtMs
    if (am.dueAtMs) return -1
    if (bm.dueAtMs) return 1
    return (toMs(b.updatedAt) ?? 0) - (toMs(a.updatedAt) ?? 0)
  }), [pendingTasks, nowMs])

  const overdueTasks  = useMemo(() => sortedPendingTasks.filter((t) => getTaskDueMeta(t, nowMs).isOverdue), [sortedPendingTasks, nowMs])
  const dueSoonTasks  = useMemo(() => sortedPendingTasks.filter((t) => getTaskDueMeta(t, nowMs).isDueSoon), [sortedPendingTasks, nowMs])

  const focusedTasks = useMemo(() => {
    if (taskFocus === 'overdue') return overdueTasks
    if (taskFocus === 'due_soon') return dueSoonTasks
    if (taskFocus === 'urgent') return sortedPendingTasks.filter((t) => t.priority === 'critical' || t.priority === 'high')
    return sortedPendingTasks
  }, [taskFocus, overdueTasks, dueSoonTasks, sortedPendingTasks])

  const urgentTaskIds  = useMemo(() => new Set(urgentTasks.map((t) => t.id)), [urgentTasks])
  const overdueTaskIds = useMemo(() => new Set(overdueTasks.map((t) => t.id)), [overdueTasks])

  const completedToday = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return tasks.filter((t) => {
      if (t.status !== 'completed' || !t.completedAt) return false
      const completed = t.completedAt.toDate ? t.completedAt.toDate() : new Date(t.completedAt as unknown as string)
      return completed >= today
    })
  }, [tasks])

  const rapidRoundQueue = useMemo(() => {
    return filteredPatients
      .map((p) => {
        let score = 0
        if (patientsWithCriticals.has(p.id)) score += 110
        if (p.acuity <= 2) score += 80
        if (p.state === 'unstable') score += 60
        score += Math.min((patientTaskCounts[p.id] || 0) * 6, 24)
        return { patient: p, score }
      })
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((e) => e.patient)
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
        mrn: patient.mrn, firstName: patient.firstName, lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth, gender: patient.gender,
        wardId: patient.wardId, bedNumber: patient.bedNumber, acuity: patient.acuity,
        primaryDiagnosis: patient.primaryDiagnosis, diagnoses: patient.diagnoses,
        allergies: patient.allergies, codeStatus: patient.codeStatus,
        attendingPhysician: patient.attendingPhysician, team: patient.team,
      },
    })
  }, [openModal])

  const handleDeletePatient = useCallback(async (patientId: string) => {
    try {
      await deletePatient(patientId)
      triggerHaptic('tap')
      addToast({ type: 'success', title: 'Patient removed' })
    } catch {
      addToast({ type: 'error', title: 'Failed to delete patient', message: 'Check permissions or try again.' })
    }
  }, [addToast])

  // ─── Sub-renders ─────────────────────────────────────────────────────────

  const renderPatientsSection = () => (
    <div className="space-y-3">
      {/* Search + controls */}
      <div className="card p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Name, MRN, bed, ward…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-700"
                aria-label="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => { triggerHaptic('tap'); setShowFilters(!showFilters) }}
            className={clsx(
              'p-2.5 rounded-xl border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
              showFilters
                ? 'border-blue-300 bg-blue-50 text-blue-600'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            )}
            aria-label="Filters"
          >
            <Filter className="h-4 w-4" />
          </button>

          <button
            onClick={() => { triggerHaptic('tap'); openModal('patient-form') }}
            className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm shadow-blue-200"
            aria-label="Add patient"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Sort + Focus */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <select
              value={patientSort}
              onChange={(e) => setPatientSort(e.target.value as PatientSort)}
              className="input-field-sm pl-8 pr-7 min-w-[160px]"
              aria-label="Sort patients"
            >
              <option value="acuity">Acuity first</option>
              <option value="bed">Ward / Bed</option>
              <option value="name">Last name</option>
              <option value="updated">Recently updated</option>
            </select>
          </div>

          <select
            value={patientFocus}
            onChange={(e) => setPatientFocus(e.target.value as PatientFocus)}
            className="input-field-sm pr-7 min-w-[160px]"
            aria-label="Patient focus"
          >
            <option value="all">All ({focusCounts.all})</option>
            <option value="critical">Critical ({focusCounts.critical})</option>
            <option value="follow_up">Follow-up ({focusCounts.followUp})</option>
            <option value="unstable">Unstable ({focusCounts.unstable})</option>
            <option value="missing_team">No team ({focusCounts.missingTeam})</option>
          </select>
        </div>

        {/* Acuity filter */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-1">
            {[null, 1, 2, 3, 4, 5].map((a) => (
              <button
                key={a ?? 'all'}
                onClick={() => setFilterAcuity(a)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                  filterAcuity === a
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                )}
              >
                {a === null ? 'All acuity' : ACUITY_LEVELS[a as keyof typeof ACUITY_LEVELS].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Count + reset */}
      {filteredPatients.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {filteredPatients.length} {filteredPatients.length === 1 ? 'patient' : 'patients'}
            {(searchQuery || filterAcuity !== null || patientFocus !== 'all') && ' · filtered'}
          </span>
          {(searchQuery || filterAcuity !== null || patientFocus !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setFilterAcuity(null); setPatientFocus('all'); setShowFilters(false) }}
              className="text-blue-600 font-semibold"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {filteredPatients.length === 0 ? (
        <div className="text-center py-14 text-gray-400 card">
          {(searchQuery || filterAcuity !== null || patientFocus !== 'all') ? (
            <>
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-gray-600">No patients match</p>
              <button onClick={() => { setSearchQuery(''); setFilterAcuity(null); setPatientFocus('all') }} className="text-xs text-blue-600 font-semibold mt-1">
                Clear filters
              </button>
            </>
          ) : (
            <>
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-gray-600 mb-1">No patients on the ward</p>
              <p className="text-xs text-gray-400 mb-4">Add your first patient to get started</p>
              <button
                onClick={() => { triggerHaptic('tap'); openModal('patient-form') }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200"
              >
                <Plus className="h-4 w-4" /> Add Patient
              </button>
            </>
          )}
        </div>
      ) : (
        /* Patient list grouped by ward */
        <div className="space-y-2">
          {patientsByWard.map(([wardName, wardPatients]) => {
            const isCollapsed = collapsedWards.has(wardName)
            const wardTaskCount = wardPatients.reduce((sum, p) => sum + (patientTaskCounts[p.id] || 0), 0)
            const wardCriticalCount = wardPatients.filter((p) => patientsWithCriticals.has(p.id) || p.acuity <= 2).length

            return (
              <div key={wardName} className="card overflow-hidden">
                <button
                  onClick={() => toggleWard(wardName)}
                  className="ward-header touch"
                >
                  {isCollapsed
                    ? <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                  <span className="text-sm font-bold text-gray-800 flex-1 text-left">{wardName}</span>
                  <span className="badge badge-info">{wardPatients.length}</span>
                  {wardTaskCount > 0 && (
                    <span className="badge badge-warning">{wardTaskCount} tasks</span>
                  )}
                  {wardCriticalCount > 0 && (
                    <span className="badge badge-critical ml-auto">{wardCriticalCount} critical</span>
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
                        onTap={() => { triggerHaptic('tap'); navigate(`/patients/${patient.id}`) }}
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
      <div className="card p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Task View</span>
          </div>
          <select
            value={taskFocus}
            onChange={(e) => setTaskFocus(e.target.value as TaskFocus)}
            className="input-field-sm min-w-[150px]"
            aria-label="Task focus"
          >
            <option value="all">All ({pendingTasks.length})</option>
            <option value="overdue">Overdue ({overdueTasks.length})</option>
            <option value="due_soon">Due Soon ({dueSoonTasks.length})</option>
            <option value="urgent">Urgent ({urgentTasks.length})</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        {focusedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400 card">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40 text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-600">All clear</p>
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
          <p className="section-label mb-2 flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Done Today ({completedToday.length})
          </p>
          <div className="space-y-1.5">
            {completedToday.slice(0, 12).map((task) => (
              <TaskRow key={task.id} task={task} variant="completed" patientMap={patientById} nowMs={nowMs} />
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderResultsSection = (compact = false) => (
    <div className="space-y-3">
      <div className="card p-3 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Critical Labs</span>
        {criticalValues.length > 0 && (
          <span className="badge badge-critical ml-auto">{criticalValues.length}</span>
        )}
      </div>

      {criticalValues.length > 0 ? (
        <div className="space-y-1.5">
          {criticalValues.slice(0, compact ? 8 : 24).map((critical, index) => {
            const patient = patientById.get(critical.patientId)
            return (
              <button
                key={`${critical.patientId}-${critical.labName}-${index}`}
                onClick={() => { triggerHaptic('tap'); navigate(`/patients/${critical.patientId}`) }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-left touch"
              >
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-red-800 truncate">
                    {critical.labName}: {critical.value} {critical.unit}
                  </p>
                  <p className="text-xs text-red-600 truncate">
                    {patient ? `Bed ${patient.bedNumber} · ${patient.lastName}, ${patient.firstName}` : 'Unknown'}
                  </p>
                </div>
                <span className="badge badge-critical flex-shrink-0">
                  {critical.flag === 'critical_high' ? 'HIGH' : 'LOW'}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 card text-gray-400">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-600">No critical values</p>
          <p className="text-xs mt-0.5">All results within alert thresholds</p>
        </div>
      )}
    </div>
  )

  // ─── Root render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Ward Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {patients.length} patients · {pendingTasks.length} open tasks
          </p>
        </div>
        <button
          onClick={() => { triggerHaptic('tap'); openModal('patient-form') }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200 flex-shrink-0"
          title="Add patient (Alt+N)"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Patient</span>
        </button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-5 gap-2">
        <StatTile icon={<Users className="h-4 w-4" />}         label="Census"    value={patients.length}        variant="blue" />
        <StatTile icon={<AlertTriangle className="h-4 w-4" />} label="Critical"  value={criticalPatients.length} variant={criticalPatients.length > 0 ? 'red' : 'green'} />
        <StatTile icon={<Clock className="h-4 w-4" />}         label="Tasks"     value={pendingTasks.length}     variant={pendingTasks.length > 0 ? 'amber' : 'green'} />
        <StatTile icon={<AlertCircle className="h-4 w-4" />}   label="Overdue"   value={overdueTasks.length}     variant={overdueTasks.length > 0 ? 'red' : 'green'} />
        <StatTile icon={<Activity className="h-4 w-4" />}      label="Lab Flags" value={criticalValues.length}   variant={criticalValues.length > 0 ? 'red' : 'green'} />
      </div>

      {/* Rapid Round Queue */}
      {rapidRoundQueue.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">Priority Round Queue</span>
            </div>
            <span className="badge badge-warning">{rapidRoundQueue.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {rapidRoundQueue.map((patient) => (
              <button
                key={patient.id}
                onClick={() => navigate(`/patients/${patient.id}`)}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white border border-amber-200 hover:bg-amber-50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-amber-900 truncate">
                    Bed {patient.bedNumber || '?'} · {patient.lastName}, {patient.firstName}
                  </p>
                  <p className="text-xs text-amber-700 truncate">
                    {patient.primaryDiagnosis || 'No diagnosis documented'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Critical values banner */}
      {criticalValues.length > 0 && (
        <div className="card-critical p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
              Critical Lab Values ({criticalValues.length})
            </span>
          </div>
          <div className="space-y-1">
            {criticalValues.slice(0, 5).map((critical, index) => {
              const patient = patientById.get(critical.patientId)
              return (
                <button
                  key={`${critical.patientId}-${critical.labName}-${index}`}
                  onClick={() => navigate(`/patients/${critical.patientId}`)}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-red-100 transition-colors text-xs"
                >
                  <span className="font-bold text-red-700 w-16 flex-shrink-0 font-mono">
                    Bed {patient?.bedNumber || '?'}
                  </span>
                  <span className="text-red-800 font-semibold truncate">
                    {patient?.lastName}, {patient?.firstName}
                  </span>
                  <span className="text-red-600 ml-auto flex-shrink-0 font-mono font-semibold">
                    {critical.labName}: {critical.value} {critical.unit}
                  </span>
                </button>
              )
            })}
            {criticalValues.length > 5 && (
              <p className="text-[10px] text-red-500 text-center pt-0.5">
                +{criticalValues.length - 5} more critical values
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mobile tab switcher */}
      {isMobile ? (
        <>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {([
              { id: 'patients' as const, label: 'Patients', count: filteredPatients.length },
              { id: 'tasks'    as const, label: 'Tasks',    count: pendingTasks.length },
              { id: 'results'  as const, label: 'Results',  count: criticalValues.length },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => { triggerHaptic('tap'); setActiveSection(tab.id) }}
                className={clsx(
                  'flex-1 py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors touch',
                  activeSection === tab.id
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={clsx(
                    'ml-1 font-bold',
                    tab.id === 'results' && tab.count > 0 ? 'text-red-500' : 'opacity-60'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeSection === 'patients' && renderPatientsSection()}
          {activeSection === 'tasks'    && renderTasksSection(false)}
          {activeSection === 'results'  && renderResultsSection(false)}
        </>
      ) : (
        /* Desktop: 8/4 split */
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

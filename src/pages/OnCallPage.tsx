/**
 * On-Call Hub
 * 4 tabs: Jobs Queue · Patients · Reference (calculators/protocols/drugs) · Handover
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  Phone,
  ListTodo,
  Users,
  BookOpen,
  ClipboardList,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
  Loader2,
  Copy,
  CheckCheck,
  Search,
  ChevronRight,
  Flag,
  AlertTriangle,
  Activity,
  Zap,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { Tabs } from '@/components/ui/Tabs'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { usePatientStore } from '@/stores/patientStore'
import { subscribeToOnCallList } from '@/services/firebase/onCallList'
import {
  subscribeToOnCallJobs,
  addOnCallJob,
  updateJobStatus,
  updateJobNote,
} from '@/services/firebase/onCallJobs'
import type { OnCallJob, JobPriority, JobStatus } from '@/types/onCall'
import type { OnCallListEntry, Priority } from '@/types/clerking'
import type { Patient } from '@/types/patient'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDate(ts: unknown): Date | null {
  if (!ts) return null
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    return (ts as { toDate: () => Date }).toDate()
  }
  try {
    return new Date(ts as string)
  } catch {
    return null
  }
}

function timeAgo(ts: unknown): string {
  const d = toDate(ts)
  if (!d) return '—'
  try {
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return '—'
  }
}

function jobAge(ts: unknown): string {
  const d = toDate(ts)
  if (!d) return ''
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
}

const JOB_PRIORITY_STYLES: Record<JobPriority, { border: string; badge: 'critical' | 'warning' | 'info' }> = {
  critical: { border: 'border-l-red-500', badge: 'critical' },
  urgent: { border: 'border-l-amber-500', badge: 'warning' },
  routine: { border: 'border-l-blue-400', badge: 'info' },
}

const PRIORITY_ORDER_MAP: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }

// ---------------------------------------------------------------------------
// Minute tick hook (for live job age timers)
// ---------------------------------------------------------------------------

function useMinuteTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])
}

// ===========================================================================
// JOBS TAB
// ===========================================================================

interface JobCardProps {
  job: OnCallJob
  onStatusChange: (jobId: string, status: JobStatus, actionNote?: string) => void
}

function JobCard({ job, onStatusChange }: JobCardProps) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [localNote, setLocalNote] = useState(job.actionNote ?? '')
  const [saving, setSaving] = useState(false)
  const noteRef = useRef(localNote)
  noteRef.current = localNote

  const styles = JOB_PRIORITY_STYLES[job.priority]
  const isDone = job.status === 'done' || job.status === 'handed_over'

  async function handleStatusChange(status: JobStatus) {
    setSaving(true)
    try {
      await onStatusChange(job.id, status, noteRef.current || undefined)
    } finally {
      setSaving(false)
    }
  }

  async function saveNote() {
    setSaving(true)
    try {
      await updateJobNote(job.id, noteRef.current)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      padding="none"
      className={clsx(
        'border-l-4 overflow-hidden transition-opacity',
        styles.border,
        isDone && 'opacity-60',
      )}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 mb-1">
              <Badge variant={styles.badge} size="sm">
                {job.priority.toUpperCase()}
              </Badge>
              {job.status === 'in_progress' && (
                <Badge variant="info" size="sm" dot>
                  In Progress
                </Badge>
              )}
              {isDone && (
                <Badge variant="success" size="sm">
                  Done
                </Badge>
              )}
            </div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              {job.patientName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Ward {job.ward}
              {job.bed ? ` · Bed ${job.bed}` : ''}
              {job.calledBy ? ` · Called by ${job.calledBy}` : ''}
            </p>
          </div>
          {/* Job age */}
          <div className="text-right shrink-0">
            <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
              <Clock size={11} />
              <JobAgeDisplay ts={job.receivedAt} />
            </span>
          </div>
        </div>

        {/* Reason */}
        <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2 mb-3">
          {job.reason}
        </p>

        {/* Action note (expandable) */}
        {job.actionNote && !noteOpen && (
          <p className="text-xs text-emerald-700 bg-emerald-50 rounded px-2.5 py-1.5 mb-3 border border-emerald-100">
            <span className="font-medium">Action:</span> {job.actionNote}
          </p>
        )}

        {noteOpen && (
          <div className="mb-3 space-y-2">
            <textarea
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              placeholder="Document what you did..."
              rows={2}
              className="w-full rounded-lg text-sm text-gray-900 px-3 py-2 bg-white border border-gray-300 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            <Button size="sm" variant="ghost" onClick={saveNote} loading={saving}>
              Save note
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isDone && (
            <>
              {job.status === 'pending' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleStatusChange('in_progress')}
                  loading={saving}
                  iconLeft={<Activity size={13} />}
                >
                  Start
                </Button>
              )}
              <Button
                size="sm"
                variant="success"
                onClick={() => handleStatusChange('done')}
                loading={saving}
                iconLeft={<Check size={13} />}
              >
                Complete
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setNoteOpen((o) => !o)}
            iconLeft={noteOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          >
            {noteOpen ? 'Hide note' : job.actionNote ? 'Edit note' : 'Add note'}
          </Button>
          {isDone && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleStatusChange('handed_over')}
              loading={saving}
              iconLeft={<CheckCheck size={13} />}
            >
              Handed over
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function JobAgeDisplay({ ts }: { ts: unknown }) {
  useMinuteTick()
  return <>{jobAge(ts)}</>
}

// Quick-add form
interface QuickAddFormProps {
  userId: string
  onAdded: () => void
}

function QuickAddForm({ userId, onAdded }: QuickAddFormProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    patientName: '',
    ward: '',
    bed: '',
    calledBy: '',
    reason: '',
    priority: 'urgent' as JobPriority,
  })

  function update(field: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [field]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.patientName.trim() || !form.ward.trim() || !form.reason.trim()) return
    setSaving(true)
    try {
      await addOnCallJob(userId, {
        patientName: form.patientName.trim(),
        ward: form.ward.trim(),
        bed: form.bed.trim() || undefined,
        calledBy: form.calledBy.trim() || undefined,
        reason: form.reason.trim(),
        priority: form.priority,
      })
      setForm({ patientName: '', ward: '', bed: '', calledBy: '', reason: '', priority: 'urgent' })
      setOpen(false)
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-4">
      {!open ? (
        <Button
          fullWidth
          variant="primary"
          iconLeft={<Plus size={16} />}
          onClick={() => setOpen(true)}
        >
          Log new job
        </Button>
      ) : (
        <Card padding="sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">New job</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Patient name"
                placeholder="e.g. John Smith"
                value={form.patientName}
                onChange={(e) => update('patientName', e.target.value)}
                required
              />
              <Input
                label="Ward"
                placeholder="e.g. 4A"
                value={form.ward}
                onChange={(e) => update('ward', e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Bed (optional)"
                placeholder="e.g. B12"
                value={form.bed}
                onChange={(e) => update('bed', e.target.value)}
              />
              <Input
                label="Called by (optional)"
                placeholder="e.g. Staff nurse"
                value={form.calledBy}
                onChange={(e) => update('calledBy', e.target.value)}
              />
            </div>
            <Textarea
              label="Reason / Complaint"
              placeholder="e.g. Temp 38.9°C, awaiting review"
              value={form.reason}
              onChange={(e) => update('reason', e.target.value)}
              required
            />
            {/* Priority selector */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-700">Priority</p>
              <div className="flex gap-2">
                {(['critical', 'urgent', 'routine'] as JobPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => update('priority', p)}
                    className={clsx(
                      'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize',
                      form.priority === p
                        ? p === 'critical'
                          ? 'bg-red-600 text-white border-red-600'
                          : p === 'urgent'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <Button
              type="submit"
              fullWidth
              loading={saving}
              disabled={!form.patientName.trim() || !form.ward.trim() || !form.reason.trim()}
            >
              Log job
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}

function JobsTab({ userId }: { userId: string }) {
  const [jobs, setJobs] = useState<OnCallJob[]>([])
  const [loading, setLoading] = useState(true)
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    const unsub = subscribeToOnCallJobs(userId, (data) => {
      setJobs(data)
      setLoading(false)
    })
    return () => unsub()
  }, [userId])

  async function handleStatusChange(jobId: string, status: JobStatus, actionNote?: string) {
    await updateJobStatus(jobId, status, { actionNote })
  }

  const activeJobs = useMemo(() => jobs.filter((j) => j.status === 'pending' || j.status === 'in_progress'), [jobs])
  const doneJobs = useMemo(() => jobs.filter((j) => j.status === 'done' || j.status === 'handed_over'), [jobs])

  if (loading) return <div className="py-12"><Spinner size="lg" label="Loading jobs..." /></div>

  return (
    <div>
      <QuickAddForm userId={userId} onAdded={() => {}} />

      {/* Active jobs */}
      {activeJobs.length === 0 && doneJobs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListTodo size={24} />}
            title="No jobs logged"
            description="Use the button above to log a new on-call job. Jobs are sorted by priority."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {activeJobs.map((job) => (
            <JobCard key={job.id} job={job} onStatusChange={handleStatusChange} />
          ))}

          {doneJobs.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                className="w-full flex items-center justify-between py-2 px-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>Completed ({doneJobs.length})</span>
                {showDone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showDone && (
                <div className="space-y-3">
                  {doneJobs.map((job) => (
                    <JobCard key={job.id} job={job} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// PATIENTS TAB
// ===========================================================================

function PatientsTab() {
  const navigate = useNavigate()
  const patients = usePatientStore((s) => s.patients)
  const [onCallEntries, setOnCallEntries] = useState<OnCallListEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToOnCallList((data) => {
      setOnCallEntries(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const patientMap = useMemo(() => {
    const m = new Map<string, Patient>()
    patients.forEach((p) => m.set(p.id, p))
    return m
  }, [patients])

  const sortedEntries = useMemo(
    () => [...onCallEntries].sort((a, b) => PRIORITY_ORDER_MAP[a.priority] - PRIORITY_ORDER_MAP[b.priority]),
    [onCallEntries],
  )

  const unstablePatients = usePatientStore((s) => s.getUnstablePatients())

  function getPriorityVariant(p: Priority) {
    return p === 'critical' ? 'critical' : p === 'high' ? 'warning' : 'default'
  }

  return (
    <div className="space-y-4">
      {/* Unstable patients signal */}
      {unstablePatients.length > 0 && (
        <Card padding="sm" className="border-red-200 bg-red-50/40">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-red-600" />
            <p className="text-sm font-semibold text-red-700">
              {unstablePatients.length} unstable patient{unstablePatients.length !== 1 ? 's' : ''} on ward
            </p>
          </div>
          <div className="space-y-1">
            {unstablePatients.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/patients/${p.id}`)}
                className="w-full text-left flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-red-100/50 transition-colors"
              >
                <span className="text-sm text-red-800 font-medium">
                  {p.firstName} {p.lastName}
                </span>
                <span className="text-xs text-red-600">
                  {p.wardId} · Bed {p.bedNumber}
                  <ChevronRight size={12} className="inline ml-1" />
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* On-call list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">On-Call List</p>
          <Badge variant={onCallEntries.length > 0 ? 'warning' : 'muted'}>
            {onCallEntries.length} patient{onCallEntries.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {loading ? (
          <div className="py-8"><Spinner size="md" label="Loading..." /></div>
        ) : sortedEntries.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Phone size={24} />}
              title="No patients on on-call list"
              description="Patients escalated during clerking will appear here."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedEntries.map((entry) => {
              const patient = patientMap.get(entry.patientId)
              return (
                <Card key={entry.id} padding="sm" className={clsx(
                  'border-l-4',
                  entry.priority === 'critical' && 'border-l-red-500 bg-red-50/30',
                  entry.priority === 'high' && 'border-l-amber-500',
                  entry.priority === 'medium' && 'border-l-blue-400',
                  entry.priority === 'low' && 'border-l-gray-300',
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={getPriorityVariant(entry.priority)} size="sm" dot>
                          {entry.priority}
                        </Badge>
                        {patient ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            {patient.firstName} {patient.lastName}
                            <ChevronRight size={13} />
                          </button>
                        ) : (
                          <span className="text-sm font-semibold text-gray-700">
                            Unknown patient
                          </span>
                        )}
                      </div>
                      {patient && (
                        <p className="text-xs text-gray-500">
                          MRN {patient.mrn} · Bed {patient.bedNumber} · {patient.primaryDiagnosis}
                        </p>
                      )}
                      {entry.escalationFlags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.escalationFlags.map((f, i) => (
                            <Badge key={i} variant="warning" size="sm">
                              <Flag size={9} className="mr-0.5" />
                              {f}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(entry.addedAt)}</span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ===========================================================================
// REFERENCE TAB — Calculators
// ===========================================================================

function CalcCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 pt-4">{children}</div>}
    </Card>
  )
}

function ScoreResult({ label, color }: { label: string; color: 'red' | 'amber' | 'green' | 'blue' | 'gray' }) {
  const colorMap = {
    red: 'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  }
  return (
    <div className={clsx('rounded-lg border px-3 py-2 text-sm font-medium mt-3', colorMap[color])}>
      {label}
    </div>
  )
}

function Curb65Calc() {
  const [vals, setVals] = useState({ c: false, u: false, r: false, b: false, age: false })
  const score = Object.values(vals).filter(Boolean).length
  const items = [
    { key: 'c', label: 'Confusion (new onset)' },
    { key: 'u', label: 'Urea > 7 mmol/L' },
    { key: 'r', label: 'Respiratory rate ≥ 30/min' },
    { key: 'b', label: 'BP < 90 systolic or ≤ 60 diastolic' },
    { key: 'age', label: 'Age ≥ 65 years' },
  ] as const

  const result =
    score <= 1
      ? { label: `Score ${score}/5 — Low risk: consider home treatment (mortality ~1.5%)`, color: 'green' as const }
      : score === 2
        ? { label: `Score ${score}/5 — Moderate: hospital admission recommended (mortality ~9%)`, color: 'amber' as const }
        : { label: `Score ${score}/5 — Severe: consider HDU/ICU (mortality ~22%)`, color: 'red' as const }

  return (
    <div className="space-y-2">
      {items.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={vals[key]}
            onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
        </label>
      ))}
      <ScoreResult label={result.label} color={result.color} />
    </div>
  )
}

function GcsCalc() {
  const [eye, setEye] = useState(4)
  const [verbal, setVerbal] = useState(5)
  const [motor, setMotor] = useState(6)
  const total = eye + verbal + motor

  const severity =
    total >= 13
      ? { label: `GCS ${total}/15 — Mild TBI`, color: 'green' as const }
      : total >= 9
        ? { label: `GCS ${total}/15 — Moderate TBI`, color: 'amber' as const }
        : { label: `GCS ${total}/15 — Severe TBI: airway management required`, color: 'red' as const }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Eye (E)</label>
          <select value={eye} onChange={(e) => setEye(Number(e.target.value))} className="w-full text-sm rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value={4}>4 – Spontaneous</option>
            <option value={3}>3 – To voice</option>
            <option value={2}>2 – To pain</option>
            <option value={1}>1 – None</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Verbal (V)</label>
          <select value={verbal} onChange={(e) => setVerbal(Number(e.target.value))} className="w-full text-sm rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value={5}>5 – Oriented</option>
            <option value={4}>4 – Confused</option>
            <option value={3}>3 – Words</option>
            <option value={2}>2 – Sounds</option>
            <option value={1}>1 – None</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Motor (M)</label>
          <select value={motor} onChange={(e) => setMotor(Number(e.target.value))} className="w-full text-sm rounded-lg border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value={6}>6 – Obeys commands</option>
            <option value={5}>5 – Localises pain</option>
            <option value={4}>4 – Withdraws</option>
            <option value={3}>3 – Flexion</option>
            <option value={2}>2 – Extension</option>
            <option value={1}>1 – None</option>
          </select>
        </div>
      </div>
      <ScoreResult label={severity.label} color={severity.color} />
    </div>
  )
}

function WellsCalc() {
  const items = [
    { key: 'dvt', label: 'Clinical signs of DVT', points: 3 },
    { key: 'alt', label: 'Alternative diagnosis less likely than PE', points: 3 },
    { key: 'hr', label: 'Heart rate > 100 bpm', points: 1.5 },
    { key: 'imm', label: 'Immobilisation ≥ 3 days or surgery in past 4 weeks', points: 1.5 },
    { key: 'prev', label: 'Previous DVT / PE', points: 1.5 },
    { key: 'haem', label: 'Haemoptysis', points: 1 },
    { key: 'malig', label: 'Active malignancy', points: 1 },
  ]
  const [vals, setVals] = useState<Record<string, boolean>>({})
  const score = items.reduce((acc, i) => acc + (vals[i.key] ? i.points : 0), 0)

  const result =
    score < 2
      ? { label: `Score ${score} — Low probability: D-dimer if indicated`, color: 'green' as const }
      : score <= 6
        ? { label: `Score ${score} — Moderate probability: D-dimer + CTPA if elevated`, color: 'amber' as const }
        : { label: `Score ${score} — High probability: immediate CTPA`, color: 'red' as const }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={!!vals[item.key]}
            onChange={(e) => setVals((v) => ({ ...v, [item.key]: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 flex-1 group-hover:text-gray-900">{item.label}</span>
          <span className="text-xs font-mono text-gray-400 shrink-0">+{item.points}</span>
        </label>
      ))}
      <ScoreResult label={result.label} color={result.color} />
    </div>
  )
}

function CorrectedCaCalc() {
  const [measuredCa, setMeasuredCa] = useState('')
  const [albumin, setAlbumin] = useState('')
  const ca = parseFloat(measuredCa)
  const alb = parseFloat(albumin)
  const corrected = !isNaN(ca) && !isNaN(alb) ? ca + 0.02 * (40 - alb) : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Measured Ca (mmol/L)" type="number" step="0.01" placeholder="2.2" value={measuredCa} onChange={(e) => setMeasuredCa(e.target.value)} />
        <Input label="Albumin (g/L)" type="number" placeholder="40" value={albumin} onChange={(e) => setAlbumin(e.target.value)} />
      </div>
      {corrected !== null && (
        <ScoreResult
          label={`Corrected Ca = ${corrected.toFixed(2)} mmol/L ${corrected < 2.2 ? '⬇ Hypocalcaemia' : corrected > 2.6 ? '⬆ Hypercalcaemia' : '✓ Normal (2.2–2.6)'}`}
          color={corrected < 2.2 || corrected > 2.6 ? 'amber' : 'green'}
        />
      )}
    </div>
  )
}

function CorrectedNaCalc() {
  const [na, setNa] = useState('')
  const [glucose, setGlucose] = useState('')
  const measuredNa = parseFloat(na)
  const gluc = parseFloat(glucose)
  const corrected = !isNaN(measuredNa) && !isNaN(gluc) && gluc > 5.6
    ? measuredNa + 0.3 * (gluc - 5.6)
    : null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Measured Na (mmol/L)" type="number" placeholder="135" value={na} onChange={(e) => setNa(e.target.value)} />
        <Input label="Glucose (mmol/L)" type="number" step="0.1" placeholder="15.0" value={glucose} onChange={(e) => setGlucose(e.target.value)} />
      </div>
      {corrected !== null && (
        <ScoreResult
          label={`Corrected Na = ${corrected.toFixed(1)} mmol/L ${corrected < 135 ? '(hyponatraemia)' : corrected > 145 ? '(hypernatraemia)' : '(normal)'}`}
          color={corrected < 130 || corrected > 148 ? 'red' : corrected < 135 || corrected > 145 ? 'amber' : 'green'}
        />
      )}
      {!isNaN(parseFloat(glucose)) && parseFloat(glucose) <= 5.6 && (
        <ScoreResult label="Correction only applies when glucose > 5.6 mmol/L" color="gray" />
      )}
    </div>
  )
}

function AkiCalc() {
  const [baseline, setBaseline] = useState('')
  const [current, setCurrent] = useState('')
  const base = parseFloat(baseline)
  const curr = parseFloat(current)
  const ratio = !isNaN(base) && !isNaN(curr) && base > 0 ? curr / base : null
  const rise = !isNaN(base) && !isNaN(curr) ? curr - base : null

  let result: { label: string; color: 'red' | 'amber' | 'green' | 'gray' } = { label: 'Enter creatinine values above', color: 'gray' }
  if (ratio !== null && rise !== null) {
    if (ratio >= 3 || curr >= 354) {
      result = { label: `AKI Stage 3 (ratio ${ratio.toFixed(1)}x) — Consider nephrology, RRT`, color: 'red' }
    } else if (ratio >= 2) {
      result = { label: `AKI Stage 2 (ratio ${ratio.toFixed(1)}x) — Nephrology review`, color: 'red' }
    } else if (ratio >= 1.5 || rise >= 26) {
      result = { label: `AKI Stage 1 (ratio ${ratio.toFixed(1)}x, rise ${Math.round(rise)} µmol/L)`, color: 'amber' }
    } else {
      result = { label: `No AKI criteria met (ratio ${ratio.toFixed(1)}x)`, color: 'green' }
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Baseline Cr (µmol/L)" type="number" placeholder="80" value={baseline} onChange={(e) => setBaseline(e.target.value)} />
        <Input label="Current Cr (µmol/L)" type="number" placeholder="160" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <ScoreResult label={result.label} color={result.color} />
      <p className="text-xs text-gray-400">KDIGO criteria: Stage 1 ≥1.5x or +26µmol/L (48h) · Stage 2 ≥2x · Stage 3 ≥3x or ≥354µmol/L</p>
    </div>
  )
}

function News2Calc() {
  const [rr, setRr] = useState('')
  const [spo2, setSpo2] = useState('')
  const [sbp, setSbp] = useState('')
  const [hr, setHr] = useState('')
  const [temp, setTemp] = useState('')
  const [o2, setO2] = useState('no')
  const [avpu, setAvpu] = useState('A')

  function rrScore(v: number) { return v <= 8 ? 3 : v <= 11 ? 1 : v <= 20 ? 0 : v <= 24 ? 2 : 3 }
  function spo2Score(v: number) { return v <= 91 ? 3 : v <= 93 ? 2 : v <= 95 ? 1 : 0 }
  function sbpScore(v: number) { return v <= 90 ? 3 : v <= 100 ? 2 : v <= 110 ? 1 : v <= 219 ? 0 : 3 }
  function hrScore(v: number) { return v <= 40 ? 3 : v <= 50 ? 1 : v <= 90 ? 0 : v <= 110 ? 1 : v <= 130 ? 2 : 3 }
  function tempScore(v: number) { return v <= 35 ? 3 : v <= 36 ? 1 : v <= 38 ? 0 : v <= 39 ? 1 : 2 }

  const scores = {
    rr: !isNaN(parseFloat(rr)) ? rrScore(parseFloat(rr)) : 0,
    spo2: !isNaN(parseFloat(spo2)) ? spo2Score(parseFloat(spo2)) : 0,
    sbp: !isNaN(parseFloat(sbp)) ? sbpScore(parseFloat(sbp)) : 0,
    hr: !isNaN(parseFloat(hr)) ? hrScore(parseFloat(hr)) : 0,
    temp: !isNaN(parseFloat(temp)) ? tempScore(parseFloat(temp)) : 0,
    o2: o2 === 'yes' ? 2 : 0,
    avpu: avpu !== 'A' ? 3 : 0,
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0)

  const result =
    total >= 7
      ? { label: `NEWS2 ${total} — HIGH risk: urgent medical review`, color: 'red' as const }
      : total >= 5
        ? { label: `NEWS2 ${total} — MEDIUM risk: urgent review`, color: 'amber' as const }
        : { label: `NEWS2 ${total} — Low risk: routine monitoring`, color: 'green' as const }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Resp rate (/min)" type="number" placeholder="18" value={rr} onChange={(e) => setRr(e.target.value)} />
        <Input label="SpO₂ (%)" type="number" placeholder="98" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
        <Input label="Systolic BP (mmHg)" type="number" placeholder="120" value={sbp} onChange={(e) => setSbp(e.target.value)} />
        <Input label="Heart rate (bpm)" type="number" placeholder="80" value={hr} onChange={(e) => setHr(e.target.value)} />
        <Input label="Temperature (°C)" type="number" step="0.1" placeholder="37.2" value={temp} onChange={(e) => setTemp(e.target.value)} />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Supplemental O₂</label>
          <select value={o2} onChange={(e) => setO2(e.target.value)} className="w-full text-sm rounded-lg border border-gray-300 h-10 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="no">No (room air)</option>
            <option value="yes">Yes (+2 pts)</option>
          </select>
        </div>
        <div className="space-y-1.5 col-span-2">
          <label className="block text-sm font-medium text-gray-700">Consciousness</label>
          <select value={avpu} onChange={(e) => setAvpu(e.target.value)} className="w-full text-sm rounded-lg border border-gray-300 h-10 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500">
            <option value="A">Alert (0)</option>
            <option value="C">Confused / CVPU (+3)</option>
          </select>
        </div>
      </div>
      <ScoreResult label={result.label} color={result.color} />
    </div>
  )
}

// ===========================================================================
// REFERENCE TAB — Protocols
// ===========================================================================

interface ProtocolStep {
  text: string
  sub?: string[]
  urgent?: boolean
}

interface Protocol {
  id: string
  title: string
  subtitle: string
  color: 'red' | 'amber' | 'blue' | 'purple'
  steps: ProtocolStep[]
  notes?: string
}

const PROTOCOLS: Protocol[] = [
  {
    id: 'sepsis6',
    title: 'Sepsis 6',
    subtitle: 'Complete within 1 hour of recognition',
    color: 'red',
    steps: [
      { text: 'TAKE 3 — Blood cultures (2 sets before abx)', urgent: true },
      { text: 'TAKE 3 — Blood gas (lactate)', urgent: true },
      { text: 'TAKE 3 — FBC, U&E, LFTs, coag, CRP' },
      { text: 'GIVE 3 — O₂ to target SpO₂ ≥ 94%', urgent: true },
      { text: 'GIVE 3 — IV fluid 30 mL/kg crystalloid (Hartmann\'s) if SBP < 90 or lactate > 2', urgent: true },
      { text: 'GIVE 3 — IV antibiotics within 1 hour', urgent: true, sub: ['Broad-spectrum empirical: e.g. pip/tazo 4.5g IV q6h ± gentamicin', 'Add meropenem if ESBL/resistant organism likely'] },
    ],
    notes: 'ESCALATE: Lactate > 4, SBP < 90 after fluids, UO < 0.5 mL/kg/h for 2h → Consultant/ICU',
  },
  {
    id: 'anaphylaxis',
    title: 'Anaphylaxis',
    subtitle: 'Immediate life-threatening reaction',
    color: 'red',
    steps: [
      { text: 'Remove trigger — call for help / resus team', urgent: true },
      { text: 'Adrenaline 0.5mg IM (anterolateral thigh) — 1:1000, 0.5 mL', urgent: true, sub: ['Repeat at 5 min if no improvement', 'IV adrenaline only by experienced clinician: 50 mcg (0.5 mL of 1:10,000)'] },
      { text: 'Lay flat + raise legs (unless respiratory distress)' },
      { text: '0.9% NaCl 500–1000 mL rapid IV bolus' },
      { text: 'Chlorphenamine 10 mg slow IV' },
      { text: 'Hydrocortisone 200 mg IV' },
      { text: 'Salbutamol 5 mg nebulised if bronchospasm' },
      { text: 'Glucagon 1 mg IV/IM if beta-blocker refractory' },
    ],
    notes: 'Observe minimum 6 hours. Discharge with Epipen × 2 + steroid course 3 days + antihistamine + allergy referral',
  },
  {
    id: 'dka',
    title: 'DKA Management',
    subtitle: 'Glucose > 11, pH < 7.3 or HCO₃ < 15, Ketones > 3',
    color: 'amber',
    steps: [
      { text: 'IV access × 2 · bloods: VBG, BM, ketones, U&E, FBC, cultures' },
      { text: '0.9% NaCl 1 L over 1 h (caution: elderly/cardiac)', urgent: true },
      { text: 'Fixed-rate insulin 0.1 units/kg/h IV — do NOT stop background basal insulin', urgent: true },
      { text: 'Add K⁺ when K⁺ < 5.5: 40 mmol KCl per litre NaCl', sub: ['K⁺ 3.5–5.5: 40 mmol/L', 'K⁺ < 3.5: 60 mmol/L + escalate', 'K⁺ > 5.5: no potassium'] },
      { text: 'Monitor: BM hourly, ketones 2-hourly, VBG 2-hourly' },
      { text: 'Switch to 10% glucose when BM < 14 mmol/L — continue insulin' },
      { text: 'Resolution: ketones < 0.6, pH > 7.35, tolerating oral → SC insulin' },
    ],
    notes: 'IDC if oliguria/obtunded. Consider NG if vomiting. HDU/ICU if severe (pH < 7.1, K⁺ < 3.5, altered consciousness)',
  },
  {
    id: 'hyperk',
    title: 'Hyperkalaemia',
    subtitle: 'K⁺ > 5.5 mmol/L — ECG first',
    color: 'amber',
    steps: [
      { text: '12-lead ECG immediately', urgent: true, sub: ['Peaked T waves → wide QRS → sine wave → VF'] },
      { text: 'If ECG changes or K⁺ > 6.0: Calcium gluconate 10 mL 10% IV over 3–5 min', urgent: true, sub: ['Cardioprotection only — does NOT lower K⁺', 'Repeat if ECG changes persist'] },
      { text: 'Insulin/dextrose: 10 units actrapid in 250 mL 20% glucose over 15–30 min', sub: ['Lowers K⁺ by 0.6–1 mmol/L in 30–60 min', 'Monitor BM: risk hypoglycaemia'] },
      { text: 'Salbutamol 10–20 mg nebulised (lowers K⁺ by 0.6–1 mmol/L)' },
      { text: 'Sodium bicarbonate 50 mL 8.4% if severe metabolic acidosis' },
      { text: 'Calcium resonium 15 g TDS PO (removes K⁺ — slow, 24–48h)' },
      { text: 'Dialysis if refractory or acute severe AKI' },
    ],
    notes: 'STOP: NSAIDs, ACEi/ARBs, K⁺-sparing diuretics, K⁺ supplements, trimethoprim. Repeat K⁺ at 1–2h.',
  },
  {
    id: 'hyponat',
    title: 'Hyponatraemia',
    subtitle: 'Symptoms determine urgency, not level alone',
    color: 'blue',
    steps: [
      { text: 'Severe symptoms (seizures, GCS < 8, resp distress):', urgent: true, sub: ['3% NaCl 150 mL IV over 20 min (may repeat × 2)', 'Target: Na rise 5 mmol/L in first hour', 'Max correction: 10–12 mmol/L per 24h (avoid osmotic demyelination)'] },
      { text: 'Moderate symptoms (confusion, nausea, vomiting):', sub: ['Fluid restrict 1 L/day', 'Correct slowly ≤ 10 mmol/L/24h'] },
      { text: 'Find cause: SIADH, heart failure, cirrhosis, hypothyroidism, Addison\'s, drugs' },
      { text: 'Na deficit formula: 0.6 × weight × (target Na − current Na)' },
    ],
    notes: 'Regular Na checks 4–6 hourly in acute management. Avoid over-correction (risk: osmotic demyelination). Refer nephrology/endocrine for chronic hyponatraemia.',
  },
  {
    id: 'pe',
    title: 'Acute PE',
    subtitle: 'Risk stratify: massive vs non-massive',
    color: 'purple',
    steps: [
      { text: 'MASSIVE PE (haemodynamically unstable — SBP < 90 or shock):', urgent: true, sub: ['Call ICU/cardiology STAT', 'O₂ + supportive care', 'If cardiac arrest → CPR + consider thrombolysis', 'Alteplase 100 mg IV over 2h (or 50 mg bolus in arrest)', 'Surgical embolectomy if thrombolysis fails'] },
      { text: 'NON-MASSIVE PE:', sub: ['Anticoagulate immediately: rivaroxaban 15 mg BD × 21d (preferred)', 'OR enoxaparin 1.5 mg/kg SC OD bridging to warfarin/DOAC', 'Risk stratify: PESI, troponin, BNP, Echo (RV strain)', 'Low risk (sPESI 0): consider outpatient treatment'] },
      { text: 'Intermediate-high risk: admit, monitor closely for deterioration' },
    ],
    notes: 'D-dimer only useful in low-intermediate pre-test probability. Confirm with CTPA.',
  },
  {
    id: 'vfvt',
    title: 'VF / Pulseless VT',
    subtitle: 'ALS algorithm — shockable rhythm',
    color: 'red',
    steps: [
      { text: 'CONFIRM arrest — call resus team', urgent: true },
      { text: 'CPR: 30:2, 100–120/min, 5–6 cm depth, minimise interruptions', urgent: true },
      { text: 'Defibrillate: 200 J biphasic — resume CPR immediately' },
      { text: 'IV/IO access — adrenaline 1 mg IV every 3–5 min (after 3rd shock)' },
      { text: 'After 3rd shock: amiodarone 300 mg IV bolus' },
      { text: '4Hs: Hypoxia · Hypovolaemia · Hypo/hyperkalaemia · Hypothermia' },
      { text: '4Ts: Tension pneumo · Tamponade · Toxins · Thrombosis (PE/MI)' },
    ],
    notes: 'Second dose amiodarone 150 mg after 5th shock. Consider TXA if traumatic arrest. Continuous ETCO₂ monitoring.',
  },
  {
    id: 'aki',
    title: 'AKI Management',
    subtitle: 'KDIGO: Cr rise ≥ 26 µmol/L in 48h or ≥ 1.5× baseline',
    color: 'blue',
    steps: [
      { text: 'STOP nephrotoxic drugs', urgent: true, sub: ['NSAIDs, ACEi/ARBs, aminoglycosides, contrast, metformin, vancomycin'] },
      { text: 'FIND CAUSE', sub: ['Pre-renal: dehydration, heart failure, sepsis', 'Renal: glomerulo/interstitial nephritis, rhabdomyolysis', 'Post-renal: urinary obstruction → BLADDER SCAN'] },
      { text: 'Pre-renal → fluid challenge: 500 mL Hartmann\'s over 15–30 min' },
      { text: 'Monitor: daily U&E, fluid balance, urine output (catheterise if oliguric)' },
      { text: 'K⁺ check 4–6 hourly if K⁺ > 5 or rising rapidly' },
      { text: 'Nephrology referral: Stage 2–3 AKI, unknown cause, no improvement' },
    ],
    notes: 'Oliguria (< 0.5 mL/kg/h for 2h): examine, fluid challenge, catheterise, review drug chart, check creatinine trend.',
  },
]

const PROTOCOL_COLORS = {
  red: { header: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  amber: { header: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  blue: { header: 'bg-blue-50 border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  purple: { header: 'bg-purple-50 border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
}

function ProtocolCard({ protocol }: { protocol: Protocol }) {
  const [open, setOpen] = useState(false)
  const colors = PROTOCOL_COLORS[protocol.color]

  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx('w-full flex items-center justify-between p-4 text-left border-b transition-colors', open ? colors.header : 'hover:bg-gray-50')}
      >
        <div>
          <p className={clsx('text-sm font-semibold', open ? colors.text : 'text-gray-800')}>{protocol.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{protocol.subtitle}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="p-4 space-y-2">
          {protocol.steps.map((step, i) => (
            <div key={i} className={clsx('rounded-lg p-3', step.urgent ? colors.header : 'bg-gray-50 border border-gray-100')}>
              <div className="flex items-start gap-2">
                <span className={clsx('text-xs font-bold shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center', step.urgent ? colors.badge : 'bg-gray-200 text-gray-600')}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className={clsx('text-sm font-medium', step.urgent ? colors.text : 'text-gray-800')}>
                    {step.text}
                  </p>
                  {step.sub && (
                    <ul className="mt-1.5 space-y-0.5">
                      {step.sub.map((s, si) => (
                        <li key={si} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-gray-400 shrink-0 mt-0.5">›</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
          {protocol.notes && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200">
              <p className="text-xs text-gray-600"><span className="font-semibold">Note:</span> {protocol.notes}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ===========================================================================
// REFERENCE TAB — Drug Guide
// ===========================================================================

interface DrugEntry {
  name: string
  dose: string
  route: string
  frequency: string
  max?: string
  notes: string
}

interface DrugCategory {
  id: string
  label: string
  drugs: DrugEntry[]
}

const DRUG_GUIDE: DrugCategory[] = [
  {
    id: 'analgesics',
    label: 'Analgesics',
    drugs: [
      { name: 'Paracetamol', dose: '1 g', route: 'PO/IV', frequency: 'q6h', max: '4 g/24h', notes: 'Reduce to 500 mg q6h if < 50 kg or hepatic impairment' },
      { name: 'Ibuprofen', dose: '400 mg', route: 'PO', frequency: 'q8h with food', notes: 'Avoid: AKI, GI bleed, heart failure, dehydration, elderly' },
      { name: 'Codeine', dose: '30–60 mg', route: 'PO', frequency: 'q4–6h', max: '240 mg/24h', notes: 'Ceiling effect. Avoid in renal impairment (metabolite accumulation)' },
      { name: 'Tramadol', dose: '50–100 mg', route: 'PO/IV', frequency: 'q6–8h', max: '400 mg/24h', notes: 'Lowers seizure threshold. Avoid with SSRIs (serotonin syndrome)' },
      { name: 'Morphine', dose: '2.5–5 mg', route: 'IV/SC', frequency: 'q4h PRN', notes: 'Titrate to pain. Caution in renal failure (metabolite accumulation)' },
      { name: 'Oxycodone', dose: '5 mg', route: 'PO', frequency: 'q4h PRN', notes: 'Preferred opioid in renal impairment over morphine' },
    ],
  },
  {
    id: 'anticoag',
    label: 'Anticoagulation',
    drugs: [
      { name: 'Enoxaparin (treatment)', dose: '1 mg/kg', route: 'SC', frequency: 'BD or 1.5 mg/kg OD', notes: 'Reduce dose if CrCl < 30. Monitor anti-Xa in renal impairment/extremes of weight' },
      { name: 'Enoxaparin (VTE prophylaxis)', dose: '40 mg', route: 'SC', frequency: 'OD', notes: '20 mg OD if CrCl < 30. Start 6–12h post-op' },
      { name: 'UFH infusion', dose: '80 units/kg bolus then 18 units/kg/h', route: 'IV', frequency: 'Continuous — titrate to APTT ratio 1.5–2.5', notes: 'Preferred in renal failure, PE with instability, high bleeding risk' },
      { name: 'Warfarin', dose: 'Variable', route: 'PO', frequency: 'OD', notes: 'Check INR. Target 2–3 (mechanical valve 2.5–3.5). Reversal: Vit K ± PCC' },
      { name: 'Rivaroxaban (VTE tx)', dose: '15 mg BD × 21d → 20 mg OD', route: 'PO', frequency: 'With food', notes: 'No bridging needed. Reversal: andexanet alfa' },
      { name: 'Apixaban (VTE tx)', dose: '10 mg BD × 7d → 5 mg BD', route: 'PO', frequency: 'BD', notes: 'Reversal: andexanet alfa' },
      { name: 'Dabigatran', dose: '150 mg BD', route: 'PO', frequency: 'BD', notes: 'Reversal: idarucizumab (Praxbind) 5 g IV' },
    ],
  },
  {
    id: 'antibiotics',
    label: 'Antibiotics',
    drugs: [
      { name: 'Co-amoxiclav (Augmentin)', dose: '1.2 g', route: 'IV', frequency: 'q8h', notes: 'CAP, UTI, skin/soft tissue. Switch to 625 mg PO q8h when able' },
      { name: 'Clarithromycin', dose: '500 mg', route: 'IV/PO', frequency: 'BD', notes: 'Atypicals (CAP). Significant drug interactions (QT, statins)' },
      { name: 'Pip/tazobactam (Tazocin)', dose: '4.5 g', route: 'IV', frequency: 'q6h', notes: 'HAP, sepsis (broad Gram-neg coverage). Extend infusion over 4h if needed' },
      { name: 'Meropenem', dose: '1–2 g', route: 'IV', frequency: 'q8h', notes: 'ESBL, severe sepsis. Reduce in renal impairment. 500 mg q8h if CrCl 10–25' },
      { name: 'Vancomycin', dose: '25–30 mg/kg loading then TDM-guided', route: 'IV', frequency: 'Infuse over 60 min/g', notes: 'MRSA, Gram-positive. AUC target 400–600. Trough target 15–20 mg/L (trough-guided)' },
      { name: 'Gentamicin', dose: '7 mg/kg (max 560 mg)', route: 'IV', frequency: 'OD', notes: 'Gram-negative synergy/severe sepsis. Check levels 6–14h post-dose. Avoid prolonged use' },
      { name: 'Metronidazole', dose: '500 mg', route: 'IV/PO', frequency: 'TDS', notes: 'Anaerobic cover (abdominal, C. diff colitis). Avoid alcohol.' },
      { name: 'Cefotaxime', dose: '2 g', route: 'IV', frequency: 'q4–6h', notes: 'Meningitis + dexamethasone. Add amoxicillin if Listeria risk (age > 55, immunocompromised)' },
    ],
  },
  {
    id: 'electrolytes',
    label: 'Electrolytes',
    drugs: [
      { name: 'Potassium IV (peripheral)', dose: '40 mmol in 1 L NaCl', route: 'IV', frequency: 'Over 4h', max: '20 mmol/h peripheral', notes: 'For central: up to 40 mmol/h with cardiac monitoring. ECG monitoring if K⁺ < 3' },
      { name: 'Sando-K (oral)', dose: '2 tabs', route: 'PO', frequency: 'TDS', notes: '12 mmol K⁺ per tab. Use when K⁺ 3–3.5 and asymptomatic' },
      { name: 'Magnesium sulphate IV', dose: '10 mmol (2.5 g) in 100 mL', route: 'IV', frequency: 'Over 30 min', notes: 'Hypomagnesaemia. For Torsades: 2 g (8 mmol) IV over 10 min' },
      { name: 'Calcium gluconate 10%', dose: '10 mL (2.25 mmol)', route: 'IV', frequency: 'Over 3–5 min', notes: 'Hypocalcaemia or hyperkalaemia (cardiac protection). May repeat × 3. ECG monitoring' },
      { name: 'Sodium bicarbonate 8.4%', dose: '50 mL (50 mmol)', route: 'IV', frequency: 'Slow bolus', notes: 'Severe metabolic acidosis in cardiac arrest only. Routine use not recommended' },
      { name: 'Phosphate IV', dose: '9 mmol over 6–12h', route: 'IV', frequency: 'BD or TDS', notes: 'Refeeding syndrome, DKA, severe hypophosphataemia (< 0.32 mmol/L)' },
    ],
  },
  {
    id: 'cardiac',
    label: 'Cardiac / Emergency',
    drugs: [
      { name: 'Adrenaline (epinephrine)', dose: '1 mg (cardiac arrest) · 0.5 mg (anaphylaxis)', route: 'IV (1:10,000) · IM (1:1,000)', frequency: 'q3–5 min (arrest)', notes: 'Cardiac arrest: 1 mg IV q3–5 min. Anaphylaxis: 0.5 mg IM anterolateral thigh' },
      { name: 'Amiodarone', dose: '300 mg bolus → 900 mg/24h infusion', route: 'IV', frequency: 'Arrest bolus or infusion', notes: 'VF/VT (arrest): 300 mg bolus. AF/VT (stable): 300 mg over 30 min then 900 mg/24h. QT prolongation' },
      { name: 'Adenosine', dose: '6 mg → 12 mg → 12 mg', route: 'IV rapid (peripheral)', frequency: 'Every 1–2 min if no response', notes: 'SVT termination. Warn: chest tightness, flushing, brief asystole. Contraindicated: asthma, 2nd/3rd degree AV block' },
      { name: 'Atropine', dose: '0.5–1 mg', route: 'IV', frequency: 'Repeat q3–5 min', max: '3 mg total', notes: 'Symptomatic bradycardia. Ineffective in 2nd/3rd degree block — transcutaneous pacing' },
      { name: 'Metoprolol', dose: '2.5–5 mg IV · 25–100 mg PO', route: 'IV/PO', frequency: 'IV: q5 min (max 3 doses) · PO: BD', notes: 'Rate control in AF. Contraindicated in acute decompensated HF, severe asthma, bradycardia' },
      { name: 'GTN (nitrates)', dose: '400 mcg sublingual · Infusion 1–10 mg/h', route: 'SL/IV', frequency: 'PRN (SL) · Titrated infusion', notes: 'ACS, acute pulmonary oedema. Hypotension risk. Avoid in RV infarct, PDE-5 inhibitors' },
      { name: 'Furosemide', dose: '40–80 mg IV (acute) · Double oral dose for IV equiv.', route: 'IV/PO', frequency: 'OD–BD', notes: 'Acute pulmonary oedema: 40–80 mg IV stat. Infusion: 10–20 mg/h for refractory oedema' },
    ],
  },
  {
    id: 'reversal',
    label: 'Reversal Agents',
    drugs: [
      { name: 'Naloxone', dose: '0.4 mg', route: 'IV/IM/SC', frequency: 'q2–3 min PRN', notes: 'Opioid reversal. Short half-life — may need repeated doses or infusion (2/3 reversal dose per hour). Caution: precipitates withdrawal + pain' },
      { name: 'Flumazenil', dose: '0.2 mg over 15 s → 0.1 mg q1 min', route: 'IV', frequency: 'q1 min PRN', max: '1 mg', notes: 'Benzodiazepine reversal. Short-acting. Risk: seizures in chronic BZD users. Rarely used clinically' },
      { name: 'Vitamin K', dose: '10 mg slow IV over 30 min', route: 'IV/PO', frequency: 'Once (may repeat)', notes: 'Warfarin reversal. Effect in 4–6h (IV). For urgent reversal add PCC. For elective reversal: 1–2 mg PO' },
      { name: 'PCC (Octaplex/Beriplex)', dose: '25–50 units/kg', route: 'IV', frequency: 'Once', notes: 'Urgent warfarin reversal (INR > 2 + major bleeding). Immediate effect. Give with Vit K' },
      { name: 'Idarucizumab (Praxbind)', dose: '5 g (2 × 2.5 g vials)', route: 'IV', frequency: 'Once', notes: 'Dabigatran reversal. Administer consecutively. Immediate reversal' },
      { name: 'Protamine sulphate', dose: '1 mg per 100 units UFH (max 50 mg)', route: 'IV', frequency: 'Slow over 10 min', notes: 'UFH reversal within 30 min of last dose. Partial reversal of LMWH. Risk: hypotension, bradycardia' },
    ],
  },
]

function DrugCard({ drug }: { drug: DrugEntry }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold text-gray-900">{drug.name}</p>
        <span className="text-xs text-gray-500 shrink-0 font-mono">{drug.route}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-600 mb-1.5">
        <span className="font-medium text-blue-700">{drug.dose}</span>
        <span>·</span>
        <span>{drug.frequency}</span>
        {drug.max && <><span>·</span><span className="text-amber-600 font-medium">Max: {drug.max}</span></>}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{drug.notes}</p>
    </div>
  )
}

function DrugsSection() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return DRUG_GUIDE.map((cat) => ({
      ...cat,
      drugs: cat.drugs.filter(
        (d) =>
          (activeCategory === 'all' || cat.id === activeCategory) &&
          (!q || d.name.toLowerCase().includes(q) || d.notes.toLowerCase().includes(q) || d.dose.toLowerCase().includes(q)),
      ),
    })).filter((cat) => cat.drugs.length > 0)
  }, [search, activeCategory])

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search drugs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        iconLeft={<Search size={15} />}
      />
      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: 'all', label: 'All' }, ...DRUG_GUIDE.map((c) => ({ id: c.id, label: c.label }))].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={clsx(
              'whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              activeCategory === cat.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No drugs found</p>
      ) : (
        filtered.map((cat) => (
          <div key={cat.id}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{cat.label}</p>
            <div className="space-y-2">
              {cat.drugs.map((drug) => (
                <DrugCard key={drug.name} drug={drug} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// Reference Tab wrapper
function ReferenceTab() {
  const [section, setSection] = useState<'calculators' | 'protocols' | 'drugs'>('calculators')

  return (
    <div>
      {/* Sub-tab pills */}
      <div className="flex gap-2 mb-5 bg-gray-100 rounded-xl p-1">
        {([
          { id: 'calculators', label: 'Calculators' },
          { id: 'protocols', label: 'Protocols' },
          { id: 'drugs', label: 'Drug Guide' },
        ] as const).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={clsx(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
              section === s.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-800',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'calculators' && (
        <div className="space-y-3">
          <CalcCard title="CURB-65" description="Pneumonia severity · Score ≥ 3 = severe">
            <Curb65Calc />
          </CalcCard>
          <CalcCard title="GCS" description="Glasgow Coma Scale · ≤ 8 = airway at risk">
            <GcsCalc />
          </CalcCard>
          <CalcCard title="Wells PE Score" description="Pre-test probability for pulmonary embolism">
            <WellsCalc />
          </CalcCard>
          <CalcCard title="NEWS2" description="Early warning score · ≥ 7 = urgent review">
            <News2Calc />
          </CalcCard>
          <CalcCard title="Corrected Calcium" description="Adjust serum Ca for hypoalbuminaemia">
            <CorrectedCaCalc />
          </CalcCard>
          <CalcCard title="Corrected Sodium" description="Na correction in hyperglycaemia (Katz formula)">
            <CorrectedNaCalc />
          </CalcCard>
          <CalcCard title="AKI Staging" description="KDIGO creatinine-based staging">
            <AkiCalc />
          </CalcCard>
        </div>
      )}

      {section === 'protocols' && (
        <div className="space-y-3">
          {PROTOCOLS.map((p) => (
            <ProtocolCard key={p.id} protocol={p} />
          ))}
        </div>
      )}

      {section === 'drugs' && <DrugsSection />}
    </div>
  )
}

// ===========================================================================
// HANDOVER TAB
// ===========================================================================

function HandoverTab({ userId }: { userId: string }) {
  const [jobs, setJobs] = useState<OnCallJob[]>([])
  const [entries, setEntries] = useState<OnCallListEntry[]>([])
  const patients = usePatientStore((s) => s.patients)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsubJobs = subscribeToOnCallJobs(userId, setJobs)
    const unsubList = subscribeToOnCallList(setEntries)
    return () => { unsubJobs(); unsubList() }
  }, [userId])

  const patientMap = useMemo(() => {
    const m = new Map<string, Patient>()
    patients.forEach((p) => m.set(p.id, p))
    return m
  }, [patients])

  const handoverText = useMemo(() => {
    const now = format(new Date(), 'dd/MM/yyyy HH:mm')
    const lines: string[] = [`ON-CALL HANDOVER — ${now}`, '']

    const activeJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'in_progress')
    const doneJobs = jobs.filter((j) => j.status === 'done' || j.status === 'handed_over')

    if (doneJobs.length > 0) {
      lines.push(`JOBS COMPLETED (${doneJobs.length}):`)
      doneJobs.forEach((j) => {
        lines.push(`• [${j.priority.toUpperCase()}] ${j.patientName} — Ward ${j.ward}${j.bed ? ` Bed ${j.bed}` : ''}`)
        lines.push(`  Reason: ${j.reason}`)
        if (j.actionNote) lines.push(`  Action: ${j.actionNote}`)
      })
      lines.push('')
    }

    if (activeJobs.length > 0) {
      lines.push(`OUTSTANDING JOBS (${activeJobs.length}):`)
      activeJobs.forEach((j) => {
        lines.push(`• [${j.priority.toUpperCase()}] ${j.patientName} — Ward ${j.ward}${j.bed ? ` Bed ${j.bed}` : ''}`)
        lines.push(`  Reason: ${j.reason}`)
        if (j.actionNote) lines.push(`  Action so far: ${j.actionNote}`)
      })
      lines.push('')
    }

    if (entries.length > 0) {
      lines.push(`ON-CALL PATIENTS (${entries.length}):`)
      const sorted = [...entries].sort((a, b) => PRIORITY_ORDER_MAP[a.priority] - PRIORITY_ORDER_MAP[b.priority])
      sorted.forEach((entry) => {
        const patient = patientMap.get(entry.patientId)
        const name = patient ? `${patient.firstName} ${patient.lastName}` : `Patient #${entry.patientId}`
        const bed = patient ? ` Bed ${patient.bedNumber}` : ''
        lines.push(`• [${entry.priority.toUpperCase()}] ${name}${bed}`)
        if (entry.escalationFlags?.length) lines.push(`  Flags: ${entry.escalationFlags.join(', ')}`)
        if (entry.notes) lines.push(`  Notes: ${entry.notes}`)
      })
      lines.push('')
    }

    if (activeJobs.length === 0 && doneJobs.length === 0 && entries.length === 0) {
      lines.push('No jobs or on-call patients to hand over.')
      lines.push('')
    }

    lines.push('Generated by MedWard Pro')
    return lines.join('\n')
  }, [jobs, entries, patientMap])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(handoverText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback: select text
    }
  }

  const activeCount = jobs.filter((j) => j.status === 'pending' || j.status === 'in_progress').length

  return (
    <div className="space-y-4">
      {activeCount > 0 && (
        <Card padding="sm" className="border-amber-200 bg-amber-50/40">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{activeCount} outstanding job{activeCount !== 1 ? 's' : ''}</span> — ensure these are documented before handover
            </p>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Handover summary</p>
        <Button
          size="sm"
          variant={copied ? 'success' : 'secondary'}
          iconLeft={copied ? <CheckCheck size={14} /> : <Copy size={14} />}
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      <Card padding="none">
        <pre className="p-4 text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
          {handoverText}
        </pre>
      </Card>
    </div>
  )
}

// ===========================================================================
// MAIN PAGE
// ===========================================================================

const TABS = [
  { id: 'jobs', label: 'Jobs', icon: <ListTodo size={15} /> },
  { id: 'patients', label: 'Patients', icon: <Users size={15} /> },
  { id: 'reference', label: 'Reference', icon: <BookOpen size={15} /> },
  { id: 'handover', label: 'Handover', icon: <ClipboardList size={15} /> },
]

export default function OnCallPage() {
  const [activeTab, setActiveTab] = useState('jobs')
  const userId = useAuthStore((s) => s.user?.id ?? '')

  // Live job count badge in header
  const [pendingCount, setPendingCount] = useState(0)
  useEffect(() => {
    if (!userId) return
    return subscribeToOnCallJobs(userId, (jobs) => {
      setPendingCount(jobs.filter((j) => j.status === 'pending' || j.status === 'in_progress').length)
    })
  }, [userId])

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-xl">
          <Phone size={18} className="text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">On-Call Hub</h1>
          <p className="text-xs text-gray-500">Jobs · Patients · Reference · Handover</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="critical">
            <Zap size={11} />
            {pendingCount} active
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs items={TABS} activeId={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div>
        {activeTab === 'jobs' && <JobsTab userId={userId} />}
        {activeTab === 'patients' && <PatientsTab />}
        {activeTab === 'reference' && <ReferenceTab />}
        {activeTab === 'handover' && <HandoverTab userId={userId} />}
      </div>
    </div>
  )
}

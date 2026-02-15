import { useState, useMemo, useCallback } from 'react'
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
} from 'lucide-react'
import { clsx } from 'clsx'
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

/** Natural sort comparator — handles "Ward 2" < "Ward 10" correctly */
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

export default function WardRoot() {
  const patients = usePatientStore((s) => s.patients)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks = useTaskStore((s) => s.tasks)
  const openModal = useUIStore((s) => s.openModal)
  const addToast = useUIStore((s) => s.addToast)
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterAcuity, setFilterAcuity] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [activeSection, setActiveSection] = useState<'patients' | 'tasks' | 'results'>('patients')
  const [collapsedWards, setCollapsedWards] = useState<Set<string>>(new Set())

  // === COMPUTED DATA ===
  const criticalPatients = useMemo(
    () => patients.filter((p) => p.acuity <= 2),
    [patients]
  )

  const filteredPatients = useMemo(() => {
    let filtered = patients
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.mrn?.toLowerCase().includes(q) ||
          p.bedNumber?.toLowerCase().includes(q) ||
          p.wardId?.toLowerCase().includes(q)
      )
    }
    if (filterAcuity !== null) {
      filtered = filtered.filter((p) => p.acuity === filterAcuity)
    }
    return filtered
  }, [patients, searchQuery, filterAcuity])

  // Group patients by ward
  const patientsByWard = useMemo(() => {
    const groups = new Map<string, Patient[]>()
    for (const p of filteredPatients) {
      const key = getWardLabel(p.wardId)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }
    // Sort patients within each ward by bed number
    for (const [, wardPatients] of groups) {
      wardPatients.sort((a, b) => naturalCompare(a.bedNumber || '', b.bedNumber || ''))
    }
    // Sort ward keys naturally, but put "Unassigned" last
    const sortedEntries = [...groups.entries()].sort((a, b) => {
      if (a[0] === 'Unassigned') return 1
      if (b[0] === 'Unassigned') return -1
      return naturalCompare(a[0], b[0])
    })
    return sortedEntries
  }, [filteredPatients])

  const toggleWard = useCallback((wardName: string) => {
    triggerHaptic('tap')
    setCollapsedWards((prev) => {
      const next = new Set(prev)
      if (next.has(wardName)) next.delete(wardName)
      else next.add(wardName)
      return next
    })
  }, [])

  const urgentTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.status === 'pending' || t.status === 'in_progress') &&
          (t.priority === 'critical' || t.priority === 'high')
      ),
    [tasks]
  )

  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress'),
    [tasks]
  )

  const completedToday = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return tasks.filter((t) => {
      if (t.status !== 'completed' || !t.completedAt) return false
      const completed = t.completedAt.toDate ? t.completedAt.toDate() : new Date(t.completedAt as unknown as string)
      return completed >= today
    })
  }, [tasks])

  const patientTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tasks) {
      if (t.patientId && (t.status === 'pending' || t.status === 'in_progress')) {
        counts[t.patientId] = (counts[t.patientId] || 0) + 1
      }
    }
    return counts
  }, [tasks])

  const patientsWithCriticals = useMemo(() => {
    const set = new Set<string>()
    for (const cv of criticalValues) set.add(cv.patientId)
    return set
  }, [criticalValues])

  const handleEditPatient = useCallback((patient: Patient) => {
    triggerHaptic('tap')
    openModal('patient-form', {
      patientId: patient.id,
      initialData: {
        mrn: patient.mrn, firstName: patient.firstName, lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth, gender: patient.gender, wardId: patient.wardId,
        bedNumber: patient.bedNumber, acuity: patient.acuity, primaryDiagnosis: patient.primaryDiagnosis,
        diagnoses: patient.diagnoses, allergies: patient.allergies, codeStatus: patient.codeStatus,
        attendingPhysician: patient.attendingPhysician, team: patient.team,
      },
    })
  }, [openModal])

  const handleDeletePatient = useCallback(async (patientId: string) => {
    try {
      await deletePatient(patientId)
      triggerHaptic('tap')
      addToast({ type: 'success', title: 'Patient deleted' })
    } catch (err) {
      console.error('Delete patient failed:', err)
      addToast({ type: 'error', title: 'Failed to delete patient', message: 'Check permissions or try again.' })
    }
  }, [addToast])

  return (
    <div className="space-y-3 animate-fade-in">
      <PageHero
        title="Ward Dashboard"
        subtitle="Monitor census, critical risks, and follow-up actions from one workspace."
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

      {/* === WARD OVERVIEW STATS === */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard icon={<Users className="h-4 w-4" />} label="Census" value={patients.length} color="blue" />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Critical" value={criticalPatients.length} color={criticalPatients.length > 0 ? 'red' : 'green'} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Tasks" value={urgentTasks.length} sub={`/${pendingTasks.length}`} color={urgentTasks.length > 0 ? 'amber' : 'green'} />
        <StatCard icon={<Activity className="h-4 w-4" />} label="Lab Flags" value={criticalValues.length} color={criticalValues.length > 0 ? 'red' : 'green'} />
      </div>

      {/* === CRITICAL ALERT BANNER === */}
      {criticalValues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Critical Values ({criticalValues.length})</span>
          </div>
          <div className="space-y-1">
            {criticalValues.slice(0, 5).map((cv, i) => {
              const p = patients.find((pt) => pt.id === cv.patientId)
              return (
                <button key={i} onClick={() => navigate(`/patients/${cv.patientId}`)} className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors text-xs">
                  <span className="font-bold text-red-700 w-12 flex-shrink-0">Bed {p?.bedNumber || '?'}</span>
                  <span className="text-red-800 font-medium truncate">{p?.lastName}, {p?.firstName}</span>
                  <span className="text-red-600 ml-auto flex-shrink-0 font-mono">{cv.labName}: {cv.value} {cv.unit}</span>
                </button>
              )
            })}
            {criticalValues.length > 5 && <p className="text-[10px] text-red-500 text-center pt-1">+{criticalValues.length - 5} more</p>}
          </div>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {([
          { id: 'patients' as const, label: 'Patients', count: patients.length },
          { id: 'tasks' as const, label: 'Tasks', count: pendingTasks.length },
          { id: 'results' as const, label: 'Results', count: criticalValues.length },
        ]).map((tab) => (
          <button key={tab.id} onClick={() => { triggerHaptic('tap'); setActiveSection(tab.id) }}
            className={clsx('flex-1 py-2 px-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors touch',
              activeSection === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {tab.label}
            {tab.count > 0 && <span className={clsx('ml-1.5 text-[10px] font-bold', tab.id === 'results' && criticalValues.length > 0 ? 'text-red-500' : 'opacity-70')}>({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Patient List — Grouped by Ward */}
      {activeSection === 'patients' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ward-muted" />
              <input type="text" placeholder="Search by name, MRN, bed, or ward..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-field pl-9 pr-8 text-sm" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ward-muted hover:text-ward-text" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <button onClick={() => { triggerHaptic('tap'); setShowFilters(!showFilters) }} className={clsx('p-2.5 rounded-lg border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch', showFilters ? 'border-primary-300 bg-primary-50 text-primary-600' : 'border-ward-border text-ward-muted hover:bg-gray-50')}>
              <Filter className="h-4 w-4" />
            </button>
            <button onClick={() => { triggerHaptic('tap'); openModal('patient-form') }} className="p-2.5 rounded-lg bg-primary-600 text-white min-h-[44px] min-w-[44px] flex items-center justify-center touch hover:bg-primary-700">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {showFilters && (
            <div className="flex gap-1.5 flex-wrap">
              {[null, 1, 2, 3, 4, 5].map((acuity) => (
                <button key={String(acuity)} onClick={() => { triggerHaptic('tap'); setFilterAcuity(acuity) }}
                  className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] touch', filterAcuity === acuity ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                  {acuity === null ? 'All' : ACUITY_LEVELS[acuity as keyof typeof ACUITY_LEVELS]?.label ?? `Acuity ${acuity}`}
                </button>
              ))}
            </div>
          )}

          {filteredPatients.length > 0 && (
            <div className="flex items-center justify-between text-xs text-ward-muted">
              <span>{filteredPatients.length} {filteredPatients.length === 1 ? 'patient' : 'patients'} in {patientsByWard.length} {patientsByWard.length === 1 ? 'ward' : 'wards'}{(searchQuery || filterAcuity !== null) && ' matching filters'}</span>
              {(searchQuery || filterAcuity !== null) && <button onClick={() => { setSearchQuery(''); setFilterAcuity(null); setShowFilters(false) }} className="text-primary-600 font-medium">Clear</button>}
            </div>
          )}

          {filteredPatients.length === 0 ? (
            <div className="text-center py-12 text-ward-muted">
              {searchQuery || filterAcuity !== null ? (
                <>
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No patients match</p>
                  <button onClick={() => { setSearchQuery(''); setFilterAcuity(null); setShowFilters(false) }} className="text-xs text-primary-600 font-medium mt-1">Clear filters</button>
                </>
              ) : (
                <>
                  <Plus className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No patients on the ward</p>
                  <button onClick={() => { triggerHaptic('tap'); openModal('patient-form') }} className="inline-flex items-center gap-1.5 px-4 py-2 mt-3 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"><Plus className="h-4 w-4" /> Add Patient</button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {patientsByWard.map(([wardName, wardPatients]) => {
                const isCollapsed = collapsedWards.has(wardName)
                return (
                  <div key={wardName} className="border border-ward-border rounded-xl overflow-hidden bg-white">
                    {/* Ward Header */}
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
                      {wardPatients.some((p) => p.acuity <= 2) && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 ml-auto flex-shrink-0" />
                      )}
                    </button>

                    {/* Patient Rows */}
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
      )}

      {/* Tasks */}
      {activeSection === 'tasks' && (
        <div className="space-y-4">
          {urgentTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Urgent ({urgentTasks.length})</h3>
              <div className="space-y-1">{urgentTasks.map((t) => <TaskRow key={t.id} task={t} variant="urgent" patients={patients} />)}</div>
            </div>
          )}
          <div>
            <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Open ({pendingTasks.length})</h3>
            <div className="space-y-1">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8 text-ward-muted"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" /><p className="text-sm font-medium">All caught up</p></div>
              ) : pendingTasks.slice(0, 20).map((t) => <TaskRow key={t.id} task={t} variant="normal" patients={patients} />)}
            </div>
          </div>
          {completedToday.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Done Today ({completedToday.length})</h3>
              <div className="space-y-1">{completedToday.slice(0, 10).map((t) => <TaskRow key={t.id} task={t} variant="completed" patients={patients} />)}</div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {activeSection === 'results' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider flex items-center gap-1"><FlaskConical className="h-3.5 w-3.5" /> Results Follow-Up</h3>
            <button onClick={() => navigate('/labs')} className="text-xs text-primary-600 font-medium touch">View All Labs</button>
          </div>
          {criticalValues.length > 0 ? (
            <div className="space-y-1.5">
              {criticalValues.map((cv, i) => {
                const p = patients.find((pt) => pt.id === cv.patientId)
                return (
                  <button key={i} onClick={() => { triggerHaptic('tap'); navigate(`/patients/${cv.patientId}`) }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-left touch">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-800 truncate">{cv.labName}: {cv.value} {cv.unit}</p>
                      <p className="text-xs text-red-600 truncate">{p ? `Bed ${p.bedNumber} — ${p.lastName}, ${p.firstName}` : 'Unknown'}</p>
                    </div>
                    <span className="text-[10px] font-bold text-red-600 uppercase px-2 py-0.5 bg-red-100 rounded-full border border-red-200 flex-shrink-0">{cv.flag === 'critical_high' ? 'HIGH' : 'LOW'}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-ward-muted"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40 text-green-400" /><p className="text-sm font-medium text-green-600">No critical values</p><p className="text-xs mt-1">All results within range.</p></div>
          )}
          <button onClick={() => { triggerHaptic('tap'); navigate('/handover') }} className="w-full flex items-center justify-between p-4 rounded-xl border border-ward-border bg-white hover:bg-gray-50 transition-colors touch">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><ArrowRightLeft className="h-5 w-5 text-amber-600" /></div>
              <div className="text-left"><p className="text-sm font-semibold text-ward-text">Generate Handover</p><p className="text-xs text-ward-muted">SBAR-formatted export</p></div>
            </div>
            <ChevronRight className="h-4 w-4 text-ward-muted" />
          </button>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number; sub?: string; color: 'blue' | 'red' | 'amber' | 'green' }) {
  const colors = { blue: 'bg-blue-50 text-blue-700', red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700', green: 'bg-green-50 text-green-700' }
  return (
    <div className={clsx('rounded-xl p-2.5 text-center', colors[color])}>
      <div className="flex items-center justify-center mb-1 opacity-70">{icon}</div>
      <p className="text-lg font-bold font-mono leading-none">{value}{sub && <span className="text-xs opacity-60">{sub}</span>}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5 opacity-70">{label}</p>
    </div>
  )
}

function WardPatientRow({ patient, taskCount, hasCritical, onTap, onEdit, onDelete }: { patient: Patient; taskCount: number; hasCritical: boolean; onTap: () => void; onEdit: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const acuityColor = patient.acuity <= 2 ? 'bg-red-500' : patient.acuity === 3 ? 'bg-yellow-500' : 'bg-green-500'
  const rightActions = confirming
    ? [{ label: 'Cancel', icon: <X className="h-4 w-4" />, color: 'bg-gray-500', onClick: () => setConfirming(false) }, { label: 'Confirm', icon: <Trash2 className="h-4 w-4" />, color: 'bg-red-600', onClick: () => { onDelete(); setConfirming(false) } }]
    : [{ label: 'Edit', icon: <Edit className="h-4 w-4" />, color: 'bg-blue-500', onClick: onEdit }, { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, color: 'bg-red-500', onClick: () => setConfirming(true) }]

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
            {hasCritical && <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-ward-muted truncate">{patient.primaryDiagnosis || 'No diagnosis'}</p>
          {patient.allergies && patient.allergies.length > 0 && <p className="text-[10px] text-red-600 font-medium truncate">Allergy: {patient.allergies.join(', ')}</p>}
        </div>
        {patient.codeStatus && patient.codeStatus !== 'full' && <span className="flex-shrink-0 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase">{patient.codeStatus}</span>}
        {taskCount > 0 && <span className="flex-shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">{taskCount}</span>}
        <ChevronRight className="h-4 w-4 text-ward-muted flex-shrink-0" />
      </button>
    </SwipeableRow>
  )
}

function TaskRow({ task, variant, patients }: { task: Task; variant: 'urgent' | 'normal' | 'completed'; patients: Patient[] }) {
  const navigate = useNavigate()
  const patient = patients.find((p) => p.id === task.patientId)
  const priorityColors: Record<string, string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-green-500' }

  return (
    <button onClick={() => { triggerHaptic('tap'); if (task.patientId) navigate(`/patients/${task.patientId}`) }}
      className={clsx('w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left touch',
        variant === 'urgent' ? 'bg-red-50 border-red-200 hover:bg-red-100' : variant === 'completed' ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-ward-border hover:bg-gray-50')}>
      <div className={clsx('h-2 w-2 rounded-full flex-shrink-0', variant === 'completed' ? 'bg-green-500' : priorityColors[task.priority] || 'bg-gray-400')} />
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium truncate', variant === 'completed' ? 'text-gray-500 line-through' : 'text-ward-text')}>{task.title}</p>
        <p className="text-xs text-ward-muted truncate">{patient ? `Bed ${patient.bedNumber} — ${patient.lastName}, ${patient.firstName}` : task.patientName || 'Unassigned'}</p>
      </div>
      {variant !== 'completed' && <span className={clsx('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0', task.priority === 'critical' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600')}>{task.priority}</span>}
    </button>
  )
}

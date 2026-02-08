import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  Plus,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  FlaskConical,
  Edit,
  Trash2,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { useUIStore } from '@/stores/uiStore'
import { triggerHaptic } from '@/utils/haptics'
import { deletePatient } from '@/services/firebase/patients'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { ACUITY_LEVELS } from '@/config/constants'
import type { Patient, Task } from '@/types'

export default function WardRoot() {
  const patients = usePatientStore((s) => s.patients)
  const removePatient = usePatientStore((s) => s.removePatient)
  const tasks = useTaskStore((s) => s.tasks)
  const openModal = useUIStore((s) => s.openModal)
  const addToast = useUIStore((s) => s.addToast)
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterAcuity, setFilterAcuity] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [activeSection, setActiveSection] = useState<'patients' | 'tasks' | 'results'>('patients')

  const filteredPatients = useMemo(() => {
    let filtered = patients
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.mrn?.toLowerCase().includes(q) ||
          p.bedNumber?.toLowerCase().includes(q)
      )
    }
    if (filterAcuity !== null) {
      filtered = filtered.filter((p) => p.acuity === filterAcuity)
    }
    return [...filtered].sort((a, b) => (a.acuity ?? 5) - (b.acuity ?? 5))
  }, [patients, searchQuery, filterAcuity])

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
      removePatient(patientId)
      triggerHaptic('tap')
      addToast({ type: 'success', title: 'Patient deleted' })
    } catch {
      addToast({ type: 'error', title: 'Failed to delete patient' })
    }
  }, [removePatient, addToast])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Section Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'patients' as const, label: 'Patients', count: patients.length },
          { id: 'tasks' as const, label: 'Tasks', count: pendingTasks.length },
          { id: 'results' as const, label: 'Results', count: 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic('tap')
              setActiveSection(tab.id)
            }}
            className={clsx(
              'flex-1 py-2 px-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors touch',
              activeSection === tab.id
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-[10px] opacity-70">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Patient List Section */}
      {activeSection === 'patients' && (
        <div className="space-y-3">
          {/* Search + Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ward-muted" />
              <input
                type="text"
                placeholder="Search patients, MRN, bed..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 text-sm"
              />
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
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                triggerHaptic('tap')
                openModal('patient-form')
              }}
              className="p-2.5 rounded-lg bg-primary-600 text-white min-h-[44px] min-w-[44px] flex items-center justify-center touch hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {showFilters && (
            <div className="flex gap-1.5 flex-wrap">
              {[null, 1, 2, 3, 4, 5].map((acuity) => (
                <button
                  key={String(acuity)}
                  onClick={() => {
                    triggerHaptic('tap')
                    setFilterAcuity(acuity)
                  }}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] touch',
                    filterAcuity === acuity
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {acuity === null
                    ? 'All'
                    : ACUITY_LEVELS[acuity as keyof typeof ACUITY_LEVELS]?.label ?? `Acuity ${acuity}`}
                </button>
              ))}
            </div>
          )}

          {/* Dense Patient Rows */}
          <div className="space-y-1">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12 text-ward-muted">
                <p className="text-sm font-medium">No patients found</p>
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <WardPatientRow
                  key={patient.id}
                  patient={patient}
                  taskCount={
                    tasks.filter(
                      (t) =>
                        t.patientId === patient.id &&
                        (t.status === 'pending' || t.status === 'in_progress')
                    ).length
                  }
                  onTap={() => {
                    triggerHaptic('tap')
                    navigate(`/patients/${patient.id}`)
                  }}
                  onEdit={() => handleEditPatient(patient)}
                  onDelete={() => handleDeletePatient(patient.id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Task Engine Section */}
      {activeSection === 'tasks' && (
        <div className="space-y-4">
          {/* Urgent Tasks */}
          {urgentTasks.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Urgent ({urgentTasks.length})
              </h3>
              <div className="space-y-1">
                {urgentTasks.map((task) => (
                  <TaskRow key={task.id} task={task} variant="urgent" />
                ))}
              </div>
            </div>
          )}

          {/* Pending Tasks */}
          <div>
            <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Open Tasks ({pendingTasks.length})
            </h3>
            <div className="space-y-1">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8 text-ward-muted text-sm">
                  No pending tasks
                </div>
              ) : (
                pendingTasks.slice(0, 20).map((task) => (
                  <TaskRow key={task.id} task={task} variant="normal" />
                ))
              )}
            </div>
          </div>

          {/* Completed Today */}
          {completedToday.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed Today ({completedToday.length})
              </h3>
              <div className="space-y-1">
                {completedToday.slice(0, 10).map((task) => (
                  <TaskRow key={task.id} task={task} variant="completed" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Follow-Up Section */}
      {activeSection === 'results' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="h-3.5 w-3.5" />
              Results Follow-Up
            </h3>
            <button
              onClick={() => navigate('/labs')}
              className="text-xs text-primary-600 font-medium touch"
            >
              View All Labs
            </button>
          </div>
          <div className="text-center py-8 text-ward-muted">
            <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Lab results requiring follow-up will appear here</p>
          </div>

          {/* Handover Quick-Access */}
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
                <p className="text-sm font-semibold text-ward-text">
                  Generate Handover
                </p>
                <p className="text-xs text-ward-muted">SBAR-formatted export</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-ward-muted" />
          </button>
        </div>
      )}
    </div>
  )
}

function WardPatientRow({
  patient,
  taskCount,
  onTap,
  onEdit,
  onDelete,
}: {
  patient: Patient
  taskCount: number
  onTap: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  const acuityColor =
    patient.acuity <= 2
      ? 'bg-red-500'
      : patient.acuity === 3
        ? 'bg-yellow-500'
        : 'bg-green-500'

  const rightActions = confirming
    ? [
        {
          label: 'Cancel',
          icon: <X className="h-4 w-4" />,
          color: 'bg-gray-500',
          onClick: () => setConfirming(false),
        },
        {
          label: 'Confirm',
          icon: <Trash2 className="h-4 w-4" />,
          color: 'bg-red-600',
          onClick: () => {
            onDelete()
            setConfirming(false)
          },
        },
      ]
    : [
        {
          label: 'Edit',
          icon: <Edit className="h-4 w-4" />,
          color: 'bg-blue-500',
          onClick: onEdit,
        },
        {
          label: 'Delete',
          icon: <Trash2 className="h-4 w-4" />,
          color: 'bg-red-500',
          onClick: () => setConfirming(true),
        },
      ]

  return (
    <SwipeableRow rightActions={rightActions}>
      <button
        onClick={onTap}
        className="w-full flex items-center gap-3 p-3 bg-white border border-ward-border rounded-lg hover:bg-gray-50 transition-all text-left touch relative"
      >
        {/* Acuity dot */}
        <div className={clsx('h-2.5 w-2.5 rounded-full flex-shrink-0', acuityColor)} />

        {/* Bed */}
        <div className="w-12 text-xs font-mono font-bold text-ward-text flex-shrink-0">
          {patient.bedNumber || '—'}
        </div>

        {/* Name + Diagnosis */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ward-text truncate">
            {patient.lastName?.toUpperCase()}, {patient.firstName}
          </p>
          <p className="text-xs text-ward-muted truncate">
            {patient.primaryDiagnosis || 'No diagnosis'}
          </p>
        </div>

        {/* Tasks badge */}
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

function TaskRow({ task, variant }: { task: Task; variant: 'urgent' | 'normal' | 'completed' }) {
  const navigate = useNavigate()

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
      <div
        className={clsx(
          'h-2 w-2 rounded-full flex-shrink-0',
          variant === 'completed' ? 'bg-green-500' : priorityColors[task.priority] || 'bg-gray-400'
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={clsx(
            'text-sm font-medium truncate',
            variant === 'completed' ? 'text-gray-500 line-through' : 'text-ward-text'
          )}
        >
          {task.title}
        </p>
        <p className="text-xs text-ward-muted truncate">
          {task.patientName} {task.bedNumber ? `- Bed ${task.bedNumber}` : ''}
        </p>
      </div>
      {variant !== 'completed' && (
        <span
          className={clsx(
            'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0',
            task.priority === 'critical'
              ? 'bg-red-100 text-red-700'
              : task.priority === 'high'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-600'
          )}
        >
          {task.priority}
        </span>
      )}
    </button>
  )
}

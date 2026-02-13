import { useState } from 'react'
import { clsx } from 'clsx'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  CopyIcon,
  CheckIcon,
  NoteIcon,
  FileListIcon,
  WarningTriangleIcon,
  HeartbeatIcon,
  ExternalLinkIcon,
} from '@/components/icons/MedicalIcons'
import { triggerHaptic } from '@/utils/haptics'
import type { Patient } from '@/types'
import type { Task } from '@/types/task'
import { QuickNoteInput } from './QuickNoteInput'

export interface QuickNote {
  patientId: string
  text: string
  timestamp: number
}

interface OnCallPatientCardProps {
  patient: Patient
  tasks: Task[]
  criticalCount: number
  notes: QuickNote[]
  expanded: boolean
  copiedSbar: boolean
  onToggle: () => void
  onRemove: () => void
  onCopySbar: () => void
  onAddNote: (text: string) => void
  onDeleteNote: (timestamp: number) => void
  onNavigate: (patientId: string) => void
  labData?: React.ReactNode
}

function getAcuityGradient(acuity: number): string {
  if (acuity <= 2) return 'linear-gradient(180deg, #ef4444, #b91c1c)'
  if (acuity === 3) return 'linear-gradient(180deg, #f59e0b, #d97706)'
  return 'linear-gradient(180deg, #22c55e, #16a34a)'
}

function getAcuityClasses(acuity: number) {
  if (acuity <= 2) return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' }
  if (acuity === 3) return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' }
  return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' }
}

function countTasksByPriority(
  tasks: Task[]
): { critical: number; high: number; medium: number; low: number } {
  return {
    critical: tasks.filter((t) => t.priority === 'critical' && t.status !== 'completed').length,
    high: tasks.filter((t) => t.priority === 'high' && t.status !== 'completed').length,
    medium: tasks.filter((t) => t.priority === 'medium' && t.status !== 'completed').length,
    low: tasks.filter((t) => t.priority === 'low' && t.status !== 'completed').length,
  }
}

export function OnCallPatientCard({
  patient,
  tasks,
  criticalCount,
  notes,
  expanded,
  copiedSbar,
  onToggle,
  onRemove,
  onCopySbar,
  onAddNote,
  onDeleteNote,
  onNavigate,
  labData,
}: OnCallPatientCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const acuityClasses = getAcuityClasses(patient.acuity)
  const taskCounts = countTasksByPriority(tasks)
  const totalTasks = tasks.filter((t) => t.status !== 'completed').length
  const patientNotes = notes.filter((n) => n.patientId === patient.id)

  const handleToggle = () => {
    triggerHaptic('tap')
    onToggle()
  }

  const handleNavigate = () => {
    triggerHaptic('tap')
    onNavigate(patient.id)
  }

  const handleRemove = () => {
    triggerHaptic('escalation')
    onRemove()
    setShowDeleteConfirm(false)
  }

  const handleCopySbar = () => {
    triggerHaptic('success')
    onCopySbar()
    setTimeout(() => {
      setShowDeleteConfirm(false)
    }, 2000)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Gradient left border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl z-10"
        style={{ background: getAcuityGradient(patient.acuity) }}
      />

      <div
        className={clsx(
          'rounded-xl border transition-all duration-200',
          'bg-slate-800/40 backdrop-blur-md border-slate-700/50',
          'shadow-sm hover:shadow-md',
          expanded && 'ring-1 ring-slate-600/50 shadow-lg'
        )}
      >
        {/* Collapsed Header */}
        <button
          onClick={handleToggle}
          className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/60 transition-colors text-left"
        >
          {/* Acuity Indicator */}
          <div className={clsx(
            'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold border',
            acuityClasses.bg,
            acuityClasses.text,
            acuityClasses.border,
          )}>
            {patient.acuity}
          </div>

          {/* Patient Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="font-semibold text-white truncate">
                {patient.firstName} {patient.lastName}
              </p>
              <span className={clsx('text-xs font-mono', acuityClasses.text)}>
                Bed {patient.bedNumber}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">MRN {patient.mrn}</span>
            </div>
            <p className="text-sm text-slate-300 truncate mt-1">{patient.primaryDiagnosis}</p>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {patient.codeStatus !== 'full' && (
              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-700/60 text-slate-200 border border-slate-600/40">
                {patient.codeStatus}
              </span>
            )}

            {totalTasks > 0 && (
              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/20">
                {totalTasks}
              </span>
            )}

            {criticalCount > 0 && (
              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/20 animate-pulse">
                {criticalCount}
              </span>
            )}

            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-700/40 text-slate-400 ml-1">
              {expanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </div>
          </div>
        </button>

        {/* Expanded Content */}
        {expanded && (
          <div className="border-t border-slate-700/40 px-4 py-4 space-y-4 animate-fade-in">
            {/* Patient Details */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <HeartbeatIcon className="h-4 w-4" />
                Details
              </h4>
              <div className="space-y-1 text-sm text-slate-300 ml-6">
                {patient.diagnoses && patient.diagnoses.length > 0 && (
                  <p>
                    <span className="text-slate-500">Diagnoses:</span> {patient.diagnoses.join(', ')}
                  </p>
                )}
                {patient.allergies && patient.allergies.length > 0 && (
                  <p>
                    <span className="text-red-400 font-semibold">Allergies:</span>{' '}
                    {patient.allergies.join(', ')}
                  </p>
                )}
                {patient.isolationPrecautions && patient.isolationPrecautions.length > 0 && (
                  <p>
                    <span className="text-amber-400 font-semibold">Isolation:</span>{' '}
                    {patient.isolationPrecautions.join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Task Summary */}
            {totalTasks > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <FileListIcon className="h-4 w-4" />
                  Tasks
                </h4>
                <div className="grid grid-cols-4 gap-2 ml-6">
                  {taskCounts.critical > 0 && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-400">{taskCounts.critical}</p>
                      <p className="text-xs text-slate-400">Critical</p>
                    </div>
                  )}
                  {taskCounts.high > 0 && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-400">{taskCounts.high}</p>
                      <p className="text-xs text-slate-400">High</p>
                    </div>
                  )}
                  {taskCounts.medium > 0 && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-yellow-400">{taskCounts.medium}</p>
                      <p className="text-xs text-slate-400">Medium</p>
                    </div>
                  )}
                  {taskCounts.low > 0 && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-400">{taskCounts.low}</p>
                      <p className="text-xs text-slate-400">Low</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lab Data Slot */}
            {labData && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <WarningTriangleIcon className="h-4 w-4" />
                  Lab Data
                </h4>
                <div className="ml-6">{labData}</div>
              </div>
            )}

            {/* Quick Notes */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <NoteIcon className="h-4 w-4" />
                Notes ({patientNotes.length})
              </h4>
              <div className="ml-6 space-y-2">
                {patientNotes.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto mb-2">
                    {patientNotes.map((note) => (
                      <div
                        key={note.timestamp}
                        className="flex items-start gap-2 p-2 rounded-lg bg-slate-700/30 border border-slate-600/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200">{note.text}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(note.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            triggerHaptic('tap')
                            onDeleteNote(note.timestamp)
                          }}
                          className="flex-shrink-0 p-1 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <CloseIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <QuickNoteInput
                  onAdd={onAddNote}
                  placeholder={`Note for ${patient.firstName}...`}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 border-t border-slate-700/40 pt-4">
              <button
                onClick={handleCopySbar}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium transition-colors',
                  copiedSbar
                    ? 'bg-green-900/50 text-green-300'
                    : 'bg-slate-700/60 hover:bg-slate-600/60 text-slate-200'
                )}
              >
                {copiedSbar ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Copied SBAR
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-4 w-4" />
                    Copy SBAR
                  </>
                )}
              </button>

              <button
                onClick={handleNavigate}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium bg-blue-600/90 hover:bg-blue-600 text-white transition-colors"
              >
                <ExternalLinkIcon className="h-4 w-4" />
                View Full Profile
              </button>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => {
                    triggerHaptic('warning')
                    setShowDeleteConfirm(true)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium bg-slate-700/40 hover:bg-red-900/30 text-slate-300 hover:text-red-300 transition-colors"
                >
                  <CloseIcon className="h-4 w-4" />
                  Remove from Workspace
                </button>
              ) : (
                <button
                  onClick={handleRemove}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium bg-red-900/50 border border-red-700/50 hover:bg-red-900 text-red-300 transition-colors"
                >
                  <WarningTriangleIcon className="h-4 w-4" />
                  Confirm Remove
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

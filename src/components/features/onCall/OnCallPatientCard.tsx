import { useState } from 'react'
import { clsx } from 'clsx'
import {
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  MessageSquare,
  FileText,
  AlertTriangle,
  Activity,
  ExternalLink,
} from 'lucide-react'
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

function getAcuityColor(acuity: 1 | 2 | 3 | 4 | 5): {
  border: string
  bg: string
  text: string
  dot: string
} {
  if (acuity <= 2) {
    return {
      border: 'border-red-500',
      bg: 'bg-red-500',
      text: 'text-red-400',
      dot: 'bg-red-500',
    }
  }
  if (acuity === 3) {
    return {
      border: 'border-amber-500',
      bg: 'bg-amber-500',
      text: 'text-amber-400',
      dot: 'bg-amber-500',
    }
  }
  return {
    border: 'border-green-500',
    bg: 'bg-green-500',
    text: 'text-green-400',
    dot: 'bg-green-500',
  }
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

  const acuityColor = getAcuityColor(patient.acuity as 1 | 2 | 3 | 4 | 5)
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
    <div
      className={clsx(
        'rounded-lg border transition-all',
        'bg-slate-800/60 border-slate-700',
        patient.acuity <= 2 && 'border-l-4 border-l-red-500',
        patient.acuity === 3 && 'border-l-4 border-l-amber-500',
        patient.acuity >= 4 && 'border-l-4 border-l-green-500',
        expanded && 'ring-1 ring-slate-600'
      )}
    >
      {/* Collapsed Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/80 transition-colors text-left"
      >
        {/* Acuity Indicator */}
        <div className={clsx('h-2 w-2 rounded-full flex-shrink-0', acuityColor.dot)} />

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="font-semibold text-white truncate">
              {patient.firstName} {patient.lastName}
            </p>
            <span className={clsx('text-xs font-mono', acuityColor.text)}>
              Bed {patient.bedNumber}
            </span>
            <span className="text-xs text-slate-400">MRN {patient.mrn}</span>
          </div>
          <p className="text-sm text-slate-300 truncate mt-1">{patient.primaryDiagnosis}</p>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {patient.codeStatus !== 'full' && (
            <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-700 text-slate-200">
              {patient.codeStatus}
            </span>
          )}

          {totalTasks > 0 && (
            <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-900/50 text-blue-300">
              {totalTasks} tasks
            </span>
          )}

          {criticalCount > 0 && (
            <span className="px-2 py-1 rounded text-xs font-semibold bg-red-900/50 text-red-300">
              {criticalCount} critical
            </span>
          )}

          <div className="text-slate-400">
            {expanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-700 px-4 py-4 space-y-4">
          {/* Patient Details */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Activity className="h-4 w-4" />
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
                <FileText className="h-4 w-4" />
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
                <AlertTriangle className="h-4 w-4" />
                Lab Data
              </h4>
              <div className="ml-6">{labData}</div>
            </div>
          )}

          {/* Quick Notes */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
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
                        <X className="h-3.5 w-3.5" />
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
          <div className="space-y-2 border-t border-slate-700 pt-4">
            <button
              onClick={handleCopySbar}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors',
                copiedSbar
                  ? 'bg-green-900/50 text-green-300'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              )}
            >
              {copiedSbar ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied SBAR
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy SBAR
                </>
              )}
            </button>

            <button
              onClick={handleNavigate}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View Full Profile
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => {
                  triggerHaptic('warning')
                  setShowDeleteConfirm(true)
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium bg-slate-700 hover:bg-red-900/30 text-slate-200 hover:text-red-300 transition-colors"
              >
                <X className="h-4 w-4" />
                Remove from Workspace
              </button>
            ) : (
              <button
                onClick={handleRemove}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium bg-red-900/50 border border-red-700 hover:bg-red-900 text-red-300 transition-colors"
              >
                <AlertTriangle className="h-4 w-4" />
                Confirm Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

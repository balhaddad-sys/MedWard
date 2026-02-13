import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { Clipboard, Copy, X, Check } from 'lucide-react'
import { triggerHaptic } from '@/utils/haptics'
import type { Patient } from '@/types'
import type { Task } from '@/types/task'

export interface QuickNote {
  patientId: string
  text: string
  timestamp: number
}

export interface CriticalValue {
  patientId: string
  labName: string
  value: string
  unit: string
}

interface HandoverPanelProps {
  patients: Patient[]
  getPatientTasks: (patientId: string) => Task[]
  getPatientCriticals: (patientId: string) => CriticalValue[]
  getPatientNotes: (patientId: string) => QuickNote[]
  onClose: () => void
}

function buildHandoverText(
  patients: Patient[],
  getPatientTasks: (patientId: string) => Task[],
  getPatientCriticals: (patientId: string) => CriticalValue[],
  getPatientNotes: (patientId: string) => QuickNote[]
): string {
  const now = new Date()
  const dateStr = now.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  let text = `╔════════════════════════════════════════════════════════╗\n`
  text += `║                 HANDOVER SUMMARY                        ║\n`
  text += `║                                                          ║\n`
  text += `║ ${dateStr.padEnd(54)}\n`
  text += `╚════════════════════════════════════════════════════════╝\n\n`

  text += `Active Patients: ${patients.length}\n\n`

  patients.forEach((patient, index) => {
    text += `─────────────────────────────────────────────────────────\n`
    text += `[${index + 1}] ${patient.firstName} ${patient.lastName} | Bed ${patient.bedNumber}\n`
    text += `─────────────────────────────────────────────────────────\n`

    text += `MRN: ${patient.mrn}\n`
    text += `Diagnosis: ${patient.primaryDiagnosis}\n`
    text += `Acuity: ${patient.acuity}/5\n`
    text += `Code Status: ${patient.codeStatus}\n`

    if (patient.allergies && patient.allergies.length > 0) {
      text += `ALLERGIES: ${patient.allergies.join(', ')}\n`
    }

    const tasks = getPatientTasks(patient.id)
    if (tasks.length > 0) {
      text += `\nTasks (${tasks.length}):\n`
      const byPriority = {
        critical: tasks.filter((t) => t.priority === 'critical' && t.status !== 'completed'),
        high: tasks.filter((t) => t.priority === 'high' && t.status !== 'completed'),
        medium: tasks.filter((t) => t.priority === 'medium' && t.status !== 'completed'),
        low: tasks.filter((t) => t.priority === 'low' && t.status !== 'completed'),
      }

      if (byPriority.critical.length > 0) {
        text += `  [CRITICAL] ${byPriority.critical.length} tasks\n`
        byPriority.critical.forEach((task) => {
          text += `    • ${task.title}\n`
        })
      }
      if (byPriority.high.length > 0) {
        text += `  [HIGH] ${byPriority.high.length} tasks\n`
        byPriority.high.forEach((task) => {
          text += `    • ${task.title}\n`
        })
      }
      if (byPriority.medium.length > 0) {
        text += `  [MEDIUM] ${byPriority.medium.length} tasks\n`
        byPriority.medium.forEach((task) => {
          text += `    • ${task.title}\n`
        })
      }
      if (byPriority.low.length > 0) {
        text += `  [LOW] ${byPriority.low.length} tasks\n`
        byPriority.low.forEach((task) => {
          text += `    • ${task.title}\n`
        })
      }
    }

    const criticals = getPatientCriticals(patient.id)
    if (criticals.length > 0) {
      text += `\nCritical Labs:\n`
      criticals.forEach((lab) => {
        text += `  • ${lab.labName}: ${lab.value} ${lab.unit}\n`
      })
    }

    const notes = getPatientNotes(patient.id)
    if (notes.length > 0) {
      text += `\nOn-Call Notes:\n`
      notes.forEach((note) => {
        const timestamp = new Date(note.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
        text += `  [${timestamp}] ${note.text}\n`
      })
    }

    text += '\n'
  })

  text += `─────────────────────────────────────────────────────────\n`
  text += `End of Handover Summary\n`

  return text
}

export function HandoverPanel({
  patients,
  getPatientTasks,
  getPatientCriticals,
  getPatientNotes,
  onClose,
}: HandoverPanelProps) {
  const [copied, setCopied] = useState(false)

  const handoverText = useMemo(
    () => buildHandoverText(patients, getPatientTasks, getPatientCriticals, getPatientNotes),
    [patients, getPatientTasks, getPatientCriticals, getPatientNotes]
  )

  const handleCopyAll = async () => {
    try {
      triggerHaptic('success')
      await navigator.clipboard.writeText(handoverText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = handoverText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      triggerHaptic('success')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Clipboard className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Handover Summary</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors',
                copied
                  ? 'bg-green-900/50 text-green-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy All
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            {handoverText}
          </pre>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4 flex-shrink-0">
          <p className="text-xs text-slate-500 text-center">
            Clinical handover summary • Use in conjunction with face-to-face handover
          </p>
        </div>
      </div>
    </div>
  )
}

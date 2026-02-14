import { generateSBAR } from './claude'
import { getPatientHistory } from '@/services/firebase/history'
import type { Patient, Task, LabPanel } from '@/types'
import type { PatientHistory } from '@/types/history'

export interface SBARData {
  situation: string
  background: string
  assessment: string
  recommendation: string
}

function buildHistoryContext(history: PatientHistory | null): string {
  if (!history) return ''
  const parts: string[] = []

  if (history.hpiText) {
    parts.push(`HPI: ${history.hpiText}`)
  }
  if (history.pmh.length > 0) {
    parts.push(`PMH: ${history.pmh.map((h) => `${h.condition}${h.status ? ` (${h.status})` : ''}`).join(', ')}`)
  }
  if (history.psh.length > 0) {
    parts.push(`PSH: ${history.psh.map((s) => `${s.procedure}${s.year ? ` (${s.year})` : ''}`).join(', ')}`)
  }
  if (history.medications.length > 0) {
    parts.push(`Medications: ${history.medications.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ''}${m.route ? ` ${m.route}` : ''}${m.frequency ? ` ${m.frequency}` : ''}`).join('; ')}`)
  }
  if (history.socialHistory.smoking || history.socialHistory.alcohol || history.socialHistory.occupation) {
    const sh: string[] = []
    if (history.socialHistory.smoking) sh.push(`Smoking: ${history.socialHistory.smoking}`)
    if (history.socialHistory.alcohol) sh.push(`Alcohol: ${history.socialHistory.alcohol}`)
    if (history.socialHistory.occupation) sh.push(`Occupation: ${history.socialHistory.occupation}`)
    parts.push(`Social Hx: ${sh.join(', ')}`)
  }
  if (history.familyHistory.length > 0) {
    parts.push(`Family Hx: ${history.familyHistory.map((f) => `${f.relation}: ${f.condition}`).join('; ')}`)
  }

  return parts.length > 0 ? `\nPatient History:\n${parts.join('\n')}` : ''
}

export const generateSBARReport = async (
  patient: Patient,
  recentLabs: LabPanel[],
  activeTasks: Task[]
): Promise<SBARData> => {
  // Fetch patient history for richer context
  let history: PatientHistory | null = null
  try {
    history = await getPatientHistory(patient.id)
  } catch {
    // History not available, continue without it
  }

  const labSummary = (recentLabs ?? [])
    .slice(0, 5)
    .map((panel) => {
      const abnormal = (panel.values ?? []).filter((v) => v.flag && v.flag !== 'normal')
      return `${panel.panelName ?? 'Unknown'}: ${abnormal.map((v) => `${v.name ?? ''}=${v.value ?? ''}${v.unit ?? ''}[${v.flag ?? 'normal'}]`).join(', ') || 'all normal'}`
    })
    .join('\n')

  const taskSummary = activeTasks
    .filter((t) => {
      const status = t.status ?? 'pending'
      return status === 'pending' || status === 'in_progress'
    })
    .map((t) => `- [${t.priority ?? 'medium'}] ${t.title ?? ''}`)
    .join('\n')

  const historyContext = buildHistoryContext(history)

  const patientData = `Patient: ${patient.firstName ?? ''} ${patient.lastName ?? ''}, ${patient.primaryDiagnosis ?? 'Unknown'}
Acuity: ${patient.acuity ?? 'N/A'}, Code Status: ${patient.codeStatus ?? 'Unknown'}
Diagnoses: ${(patient.diagnoses ?? []).join(', ')}
Allergies: ${(patient.allergies ?? []).join(', ')}
${historyContext}
Recent Labs:
${labSummary}

Active Tasks:
${taskSummary}`

  return generateSBAR(patientData)
}

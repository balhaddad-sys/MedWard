import { callAI } from './claude'
import type { Patient, Task, LabPanel } from '@/types'

export interface SBARData {
  situation: string
  background: string
  assessment: string
  recommendation: string
}

export const generateSBARReport = async (
  patient: Patient,
  recentLabs: LabPanel[],
  activeTasks: Task[]
): Promise<SBARData> => {
  const labSummary = (recentLabs ?? [])
    .slice(0, 5)
    .map((panel) => {
      const abnormal = (panel.values ?? []).filter((v) => v.flag && v.flag !== 'normal')
      return `${panel.panelName ?? 'Unknown'}: ${abnormal.map((v) => `${v.name ?? ''}=${v.value ?? ''}${v.unit ?? ''}[${v.flag ?? 'normal'}]`).join(', ') || 'all normal'}`
    })
    .join('\n')

  const taskSummary = activeTasks
    .filter((t) => t.status !== 'completed')
    .map((t) => `- [${t.priority}] ${t.title}`)
    .join('\n')

  const prompt = `Generate SBAR report for:
Patient: ${patient.firstName ?? ''} ${patient.lastName ?? ''}, ${patient.primaryDiagnosis ?? 'Unknown'}
Acuity: ${patient.acuity ?? 'N/A'}, Code Status: ${patient.codeStatus ?? 'Unknown'}
Diagnoses: ${(patient.diagnoses ?? []).join(', ')}
Allergies: ${(patient.allergies ?? []).join(', ')}

Recent Labs:
${labSummary}

Active Tasks:
${taskSummary}

Respond in JSON: { "situation": "", "background": "", "assessment": "", "recommendation": "" }`

  const response = await callAI({ prompt, maxTokens: 2048 })
  try {
    const parsed = JSON.parse(response.content)
    return {
      situation: parsed.situation ?? '',
      background: parsed.background ?? '',
      assessment: parsed.assessment ?? '',
      recommendation: parsed.recommendation ?? '',
    }
  } catch {
    return {
      situation: `${patient.firstName ?? ''} ${patient.lastName ?? ''} - ${patient.primaryDiagnosis ?? 'Unknown'}`,
      background: response.content,
      assessment: '',
      recommendation: '',
    }
  }
}

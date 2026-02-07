import { callAI } from './claude'
import type { LabPanel, LabAIAnalysis, LabValue } from '@/types'

export const analyzeLabPanel = async (
  panel: LabPanel,
  patientHistory?: string
): Promise<LabAIAnalysis> => {
  const labSummary = (panel.values ?? [])
    .map((v) => `${v.name ?? 'Unknown'}: ${v.value ?? ''} ${v.unit ?? ''} (ref: ${v.referenceMin ?? '?'}-${v.referenceMax ?? '?'}) [${v.flag ?? 'normal'}]`)
    .join('\n')

  const prompt = `Analyze these ${panel.panelName} results:\n${labSummary}${
    patientHistory ? `\n\nPatient context: ${patientHistory}` : ''
  }\n\nRespond in JSON: { "summary": "", "clinicalSignificance": "critical|significant|routine|normal", "keyFindings": [], "suggestedActions": [], "trends": [] }`

  const response = await callAI({ prompt, maxTokens: 1024 })
  try {
    return JSON.parse(response.content) as LabAIAnalysis
  } catch {
    return {
      summary: response.content,
      clinicalSignificance: 'routine',
      keyFindings: [],
      suggestedActions: [],
      trends: [],
    } as unknown as LabAIAnalysis
  }
}

export const detectCriticalValues = (values: LabValue[]): LabValue[] => {
  return (values ?? []).filter((v) => v.flag === 'critical_low' || v.flag === 'critical_high')
}

export const calculateDelta = (current: number, previous: number): { delta: number; deltaPercent: number } => {
  const delta = current - previous
  const deltaPercent = previous !== 0 ? (delta / previous) * 100 : 0
  return { delta: Math.round(delta * 100) / 100, deltaPercent: Math.round(deltaPercent * 10) / 10 }
}

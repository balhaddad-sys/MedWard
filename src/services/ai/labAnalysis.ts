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

  const response = await callAI({ prompt, maxTokens: 1024, promptType: 'lab-analysis' })
  try {
    // Strip markdown code fences if the AI wrapped JSON in ```json ... ```
    let raw = response.content.trim()
    const fenceMatch = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/m)
    if (fenceMatch) raw = fenceMatch[1].trim()

    const parsed = JSON.parse(raw)
    return {
      summary: parsed.summary ?? raw,
      clinicalSignificance: parsed.clinicalSignificance ?? 'routine',
      keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
      trends: Array.isArray(parsed.trends) ? parsed.trends : [],
    } as unknown as LabAIAnalysis
  } catch {
    // If JSON parse still fails, treat the whole response as plain-text summary
    return {
      summary: response.content.replace(/```json\s*|```/g, '').trim(),
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

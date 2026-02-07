import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'

interface AIRequest {
  prompt: string
  context?: string
  maxTokens?: number
}

interface AIResponse {
  content: string
  usage: { inputTokens: number; outputTokens: number }
}

export const callAI = async (request: AIRequest): Promise<AIResponse> => {
  const fn = httpsCallable<AIRequest, AIResponse>(functions, 'analyzeWithAI')
  const result = await fn(request)
  return result.data
}

export const analyzeLabResults = async (
  labData: string,
  patientContext: string
): Promise<string> => {
  const response = await callAI({
    prompt: `Analyze these lab results for clinical significance:\n\n${labData}`,
    context: patientContext,
    maxTokens: 1024,
  })
  return response.content
}

export const generateSBAR = async (
  patientData: string
): Promise<{ situation: string; background: string; assessment: string; recommendation: string }> => {
  const response = await callAI({
    prompt: `Generate an SBAR report for this patient:\n\n${patientData}`,
    maxTokens: 2048,
  })
  try {
    const parsed = JSON.parse(response.content)
    return {
      situation: parsed.situation ?? response.content,
      background: parsed.background ?? '',
      assessment: parsed.assessment ?? '',
      recommendation: parsed.recommendation ?? '',
    }
  } catch {
    return {
      situation: response.content,
      background: '',
      assessment: '',
      recommendation: '',
    }
  }
}

export const generateHandoverSummary = async (
  patientsData: string
): Promise<string> => {
  const response = await callAI({
    prompt: `Generate a concise shift handover summary for the following patients:\n\n${patientsData}`,
    maxTokens: 4096,
  })
  return response.content
}

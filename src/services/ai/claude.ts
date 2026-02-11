import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'

interface AIRequest {
  prompt: string
  context?: string
  maxTokens?: number
  promptType?: 'lab-analysis' | 'clinical-assistant' | 'drug-info'
}

interface AIResponse {
  content: string
  usage: { inputTokens: number; outputTokens: number }
}

interface SBARResponse {
  situation: string
  background: string
  assessment: string
  recommendation: string
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
  const fn = httpsCallable<{ patientData: string }, SBARResponse>(functions, 'generateSBAR')
  const result = await fn({ patientData })
  return {
    situation: result.data.situation || '',
    background: result.data.background || '',
    assessment: result.data.assessment || '',
    recommendation: result.data.recommendation || '',
  }
}

export const generateHandoverSummary = async (
  wardId: string
): Promise<string> => {
  const fn = httpsCallable<{ wardId: string }, AIResponse>(functions, 'generateHandover')
  const result = await fn({ wardId })
  return result.data.content
}

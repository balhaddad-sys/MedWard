import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'

interface AIResponse {
  content: string
  usage: { inputTokens: number; outputTokens: number }
}

interface TaskSuggestion {
  title: string
  category: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  rationale: string
}

export async function callWardRoundBrief(patientIds: string[]): Promise<string> {
  const fn = httpsCallable<{ patientIds: string[] }, AIResponse>(functions, 'generateWardRoundBrief')
  const result = await fn({ patientIds })
  return result.data.content
}

export async function callProgressNote(patientId: string, subjective?: string): Promise<string> {
  const fn = httpsCallable<{ patientId: string; subjective?: string }, AIResponse>(functions, 'generateProgressNote')
  const result = await fn({ patientId, subjective })
  return result.data.content
}

export async function callDischargeSummary(patientId: string): Promise<string> {
  const fn = httpsCallable<{ patientId: string }, AIResponse>(functions, 'generateDischargeSummary')
  const result = await fn({ patientId })
  return result.data.content
}

export async function callSuggestTasks(patientId: string): Promise<TaskSuggestion[]> {
  const fn = httpsCallable<{ patientId: string }, { suggestions: TaskSuggestion[] }>(functions, 'suggestTasks')
  const result = await fn({ patientId })
  return result.data.suggestions || []
}

export async function callLabNarrative(patientId: string, labData: string): Promise<string> {
  const fn = httpsCallable<{ patientId: string; labData: string }, AIResponse>(functions, 'generateLabNarrative')
  const result = await fn({ patientId, labData })
  return result.data.content
}

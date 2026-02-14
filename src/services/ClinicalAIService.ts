import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'

export interface DrugInfo {
  name: string
  genericName: string
  drugClass: string
  status: 'brand' | 'generic' | 'both'
  warnings: WarningItem[]
  dosing: DosingInfo
  interactions: InteractionInfo[]
  sideEffects: SideEffectInfo[]
  specialPopulations: SpecialPopulationInfo[]
  mechanism: string
  confidence: number
  sources: string[]
  lastUpdated: Date
}

export interface WarningItem {
  severity: 'critical' | 'warning' | 'caution'
  text: string
  relevantTo?: string[]
}

export interface DosingInfo {
  standard: { adult: string; elderly: string; pediatric?: string }
  renal?: { normal: string; mild: string; moderate: string; severe: string }
  hepatic?: { mild: string; moderate: string; severe: string }
  maxDailyDose?: string
}

export interface InteractionInfo {
  drugName: string
  severity: 'contraindicated' | 'severe' | 'moderate' | 'minor'
  mechanism: string
  recommendation: string
  evidence: string
}

export interface SideEffectInfo {
  name: string
  frequency: 'very common' | 'common' | 'uncommon' | 'rare'
  frequencyPercent?: number
  severity: 'mild' | 'moderate' | 'severe'
  management?: string
}

export interface SpecialPopulationInfo {
  population: 'pregnancy' | 'lactation' | 'pediatric' | 'elderly' | 'renal' | 'hepatic'
  category?: string
  risk: 'safe' | 'caution' | 'contraindicated'
  details: string
}

export interface PatientContext {
  age: number
  weight: number
  height: number
  renal?: 'normal' | 'mild' | 'moderate' | 'severe'
  hepatic?: 'normal' | 'mild' | 'moderate' | 'severe'
  pregnancy?: boolean
  lactating?: boolean
  currentMeds?: string[]
  allergies?: string[]
  conditions?: string[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  drugInfo?: DrugInfo
  isError?: boolean
}

interface ClinicalChatRequest {
  message: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  patientId?: string
}

interface ClinicalChatResponse {
  content: string
  usage: { inputTokens: number; outputTokens: number }
}

export class ClinicalAIService {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  private patientId?: string

  setPatientContext(patientId?: string): void {
    if (this.patientId !== patientId) {
      this.patientId = patientId
      this.clearHistory()
    }
  }

  clearPatientContext(): void {
    this.setPatientContext(undefined)
  }

  async sendMessage(
    userMessage: string,
    _patientContext?: PatientContext
  ): Promise<{ text: string; drugInfo?: DrugInfo }> {
    try {
      const fn = httpsCallable<ClinicalChatRequest, ClinicalChatResponse>(
        functions,
        'clinicalChat'
      )

      const result = await fn({
        message: userMessage,
        conversationHistory: this.conversationHistory,
        patientId: this.patientId,
      })

      const text = result.data.content

      // Update local conversation history for multi-turn
      this.conversationHistory.push({ role: 'user', content: userMessage })
      this.conversationHistory.push({ role: 'assistant', content: text })

      // Cap history to prevent unbounded growth
      const MAX_HISTORY_MESSAGES = 20
      if (this.conversationHistory.length > MAX_HISTORY_MESSAGES * 2) {
        this.conversationHistory = this.conversationHistory.slice(-MAX_HISTORY_MESSAGES * 2)
      }

      // Try parsing as structured drug info
      let drugInfo: DrugInfo | undefined
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.name && parsed.drugClass) {
            drugInfo = {
              ...parsed,
              lastUpdated: new Date(parsed.lastUpdated || Date.now()),
            }
          }
        }
      } catch {
        // Not structured JSON, use as plain text
      }

      return { text, drugInfo }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      throw new Error(`AI service error: ${errorMessage}`)
    }
  }

  clearHistory(): void {
    this.conversationHistory = []
  }

  isDrugQuery(message: string): boolean {
    const drugKeywords = [
      'drug info',
      'drug information',
      'medication',
      'dosing',
      'dose',
      'side effect',
      'interaction',
      'contraindication',
      'prescribe',
      'what is',
      'tell me about',
    ]
    const lower = message.toLowerCase()
    return drugKeywords.some((kw) => lower.includes(kw))
  }
}

export const clinicalAIService = new ClinicalAIService()

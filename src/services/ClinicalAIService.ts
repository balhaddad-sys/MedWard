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

const SYSTEM_PROMPT = `You are a clinical decision support AI for licensed healthcare professionals.

RULES:
1. Respond with medically accurate, evidence-based information only.
2. For drug queries, return structured JSON matching the DrugInfo interface.
3. Always include confidence scores based on evidence quality.
4. Flag patient-specific contraindications when PatientContext is provided.
5. Include sources (UpToDate, FDA label, clinical guidelines).
6. State "AI-generated — verify with primary sources" on every response.
7. Never provide definitive diagnoses. Support differential thinking.

When asked about a drug, respond ONLY with valid JSON matching this structure:
{
  "name": "Brand Name",
  "genericName": "generic name",
  "drugClass": "class",
  "status": "brand" | "generic" | "both",
  "warnings": [{"severity": "critical"|"warning"|"caution", "text": "...", "relevantTo": ["condition"]}],
  "dosing": {"standard": {"adult": "...", "elderly": "...", "pediatric": "..."}, "renal": {...}, "hepatic": {...}, "maxDailyDose": "..."},
  "interactions": [{"drugName": "...", "severity": "contraindicated"|"severe"|"moderate"|"minor", "mechanism": "...", "recommendation": "...", "evidence": "..."}],
  "sideEffects": [{"name": "...", "frequency": "very common"|"common"|"uncommon"|"rare", "frequencyPercent": 0, "severity": "mild"|"moderate"|"severe", "management": "..."}],
  "specialPopulations": [{"population": "pregnancy"|"lactation"|"pediatric"|"elderly"|"renal"|"hepatic", "category": "...", "risk": "safe"|"caution"|"contraindicated", "details": "..."}],
  "mechanism": "...",
  "confidence": 85,
  "sources": ["source1", "source2"],
  "lastUpdated": "2026-01-01"
}`

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  drugInfo?: DrugInfo
  isError?: boolean
}

export class ClinicalAIService {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []

  async sendMessage(
    userMessage: string,
    patientContext?: PatientContext
  ): Promise<{ text: string; drugInfo?: DrugInfo }> {
    this.conversationHistory.push({ role: 'user', content: userMessage })

    try {
      const systemPrompt = patientContext
        ? `${SYSTEM_PROMPT}\n\nCurrent Patient Context:\n${JSON.stringify(patientContext, null, 2)}`
        : SYSTEM_PROMPT

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: systemPrompt,
          messages: this.conversationHistory,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      const text = data.content?.[0]?.type === 'text' ? data.content[0].text : ''

      this.conversationHistory.push({ role: 'assistant', content: text })

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

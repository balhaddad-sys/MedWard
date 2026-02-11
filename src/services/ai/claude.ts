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

/**
 * Extract JSON from AI response content that may be wrapped in markdown
 * code fences or contain surrounding text.
 */
function extractJSON(content: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(content)
  } catch {
    // noop
  }

  // Try extracting from markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {
      // noop
    }
  }

  // Try finding a JSON object in the content
  const braceStart = content.indexOf('{')
  const braceEnd = content.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(content.slice(braceStart, braceEnd + 1))
    } catch {
      // noop
    }
  }

  return null
}

function isSBARResponse(obj: unknown): obj is { situation?: string; background?: string; assessment?: string; recommendation?: string } {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj)
}

export const generateSBAR = async (
  patientData: string
): Promise<{ situation: string; background: string; assessment: string; recommendation: string }> => {
  const fn = httpsCallable<{ patientData: string }, AIResponse>(functions, 'generateSBAR')
  const result = await fn({ patientData })

  const content = result.data.content

  const parsed = extractJSON(content)
  if (parsed && isSBARResponse(parsed)) {
    return {
      situation: parsed.situation || '',
      background: parsed.background || '',
      assessment: parsed.assessment || '',
      recommendation: parsed.recommendation || '',
    }
  }

  // If JSON parsing failed, try to split by SBAR section headers
  const sections = parseSBARText(content)
  if (sections) {
    return sections
  }

  // Final fallback: put everything in situation
  return {
    situation: content,
    background: '',
    assessment: '',
    recommendation: '',
  }
}

/**
 * Parse plain-text SBAR content by looking for section headers like
 * "S:", "Situation:", "B:", "Background:", etc.
 */
function parseSBARText(text: string): { situation: string; background: string; assessment: string; recommendation: string } | null {
  const patterns = [
    { key: 'situation', regex: /(?:^|\n)\s*(?:S(?:ituation)?)\s*[:—\-]\s*/i },
    { key: 'background', regex: /(?:^|\n)\s*(?:B(?:ackground)?)\s*[:—\-]\s*/i },
    { key: 'assessment', regex: /(?:^|\n)\s*(?:A(?:ssessment)?)\s*[:—\-]\s*/i },
    { key: 'recommendation', regex: /(?:^|\n)\s*(?:R(?:ecommendation)?s?)\s*[:—\-]\s*/i },
  ]

  const positions: { key: string; start: number; headerEnd: number }[] = []

  for (const p of patterns) {
    const match = p.regex.exec(text)
    if (match) {
      positions.push({ key: p.key, start: match.index, headerEnd: match.index + match[0].length })
    }
  }

  if (positions.length < 2) return null

  positions.sort((a, b) => a.start - b.start)

  const result: Record<string, string> = { situation: '', background: '', assessment: '', recommendation: '' }
  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start : text.length
    result[positions[i].key] = text.slice(positions[i].headerEnd, end).trim()
  }

  return {
    situation: result.situation,
    background: result.background,
    assessment: result.assessment,
    recommendation: result.recommendation,
  }
}

export const generateHandoverSummary = async (
  wardId: string
): Promise<string> => {
  const fn = httpsCallable<{ wardId: string }, AIResponse>(functions, 'generateHandover')
  const result = await fn({ wardId })
  return result.data.content
}

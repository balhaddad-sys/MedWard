import { httpsCallable, type HttpsCallableResult } from 'firebase/functions'
import { functions } from '@/config/firebase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface SBARResult {
  situation: string
  background: string
  assessment: string
  recommendation: string
}

export class AIServiceError extends Error {
  code: 'timeout' | 'network' | 'server' | 'parse' | 'unknown'
  retryable: boolean
  override cause?: unknown

  constructor(
    message: string,
    code: 'timeout' | 'network' | 'server' | 'parse' | 'unknown',
    retryable: boolean,
    cause?: unknown
  ) {
    super(message)
    this.name = 'AIServiceError'
    this.code = code
    this.retryable = retryable
    this.cause = cause
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 30_000
const MAX_RETRIES = 2
const RETRY_BASE_MS = 1_000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return (
      msg.includes('deadline-exceeded') ||
      msg.includes('unavailable') ||
      msg.includes('internal') ||
      msg.includes('resource-exhausted') ||
      msg.includes('network') ||
      msg.includes('econnreset') ||
      msg.includes('timeout')
    )
  }
  return false
}

function toServiceError(err: unknown, context: string): AIServiceError {
  if (err instanceof AIServiceError) return err

  const message = err instanceof Error ? err.message : String(err)
  const isTimeout = message.toLowerCase().includes('timeout') || message.toLowerCase().includes('deadline')
  const isNetwork = message.toLowerCase().includes('network') || message.toLowerCase().includes('econnreset')

  if (isTimeout) {
    return new AIServiceError(`${context}: request timed out`, 'timeout', true, err)
  }
  if (isNetwork) {
    return new AIServiceError(`${context}: network error`, 'network', true, err)
  }
  return new AIServiceError(`${context}: ${message}`, 'server', false, err)
}

async function callWithRetry<TReq, TRes>(
  fn: ReturnType<typeof httpsCallable<TReq, TRes>>,
  data: TReq,
  context: string
): Promise<HttpsCallableResult<TRes>> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await Promise.race([
        fn(data),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new AIServiceError(
            `${context}: timed out after ${DEFAULT_TIMEOUT_MS}ms`,
            'timeout',
            true
          )), DEFAULT_TIMEOUT_MS)
        ),
      ])
      return result
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES && isTransientError(err)) {
        await delay(RETRY_BASE_MS * 2 ** attempt)
        continue
      }
      break
    }
  }

  throw toServiceError(lastError, context)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function callAI(request: AIRequest): Promise<AIResponse> {
  const fn = httpsCallable<AIRequest, AIResponse>(functions, 'analyzeWithAI')
  const result = await callWithRetry(fn, request, 'callAI')
  return result.data
}

export async function analyzeLabResults(
  labData: string,
  patientContext: string
): Promise<string> {
  const response = await callAI({
    prompt: `Analyze these lab results for clinical significance:\n\n${labData}`,
    context: patientContext,
    maxTokens: 1024,
  })
  return response.content
}

export async function generateSBAR(patientData: string): Promise<SBARResult> {
  const fn = httpsCallable<{ patientData: string }, SBARResponse>(functions, 'generateSBAR')
  const result = await callWithRetry(fn, { patientData }, 'generateSBAR')

  return {
    situation: result.data.situation || '',
    background: result.data.background || '',
    assessment: result.data.assessment || '',
    recommendation: result.data.recommendation || '',
  }
}

export async function generateHandoverSummary(wardId: string, patientIds?: string[]): Promise<string> {
  const fn = httpsCallable<{ wardId: string; patientIds?: string[] }, AIResponse>(functions, 'generateHandover')
  const result = await callWithRetry(fn, { wardId, patientIds }, 'generateHandoverSummary')
  return result.data.content
}

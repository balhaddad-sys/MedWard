/**
 * React hook for the AI Gateway Cloud Function.
 *
 * Provides a typed, ergonomic interface to the unified AI gateway
 * that handles caching, PHI redaction, and Claude routing server-side.
 *
 * Usage:
 *   const { query, loading, error } = useAiGateway()
 *   const result = await query("What is the first-line treatment for DKA?", "clinical_guidelines")
 *   console.log(result.response, result.cacheHit)
 */

import { useState, useCallback, useRef } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'

// ---------------------------------------------------------------------------
// Types (mirror the Cloud Function interface)
// ---------------------------------------------------------------------------

export type AiContextTag =
  | 'clinical_guidelines'
  | 'lab_analysis'
  | 'drug_info'
  | 'sheet_parser'
  | 'formatting'
  | 'clinical_chat'
  | 'general'

export interface AiGatewayRequest {
  prompt: string
  contextTag: AiContextTag
  context?: string
  systemInstruction?: string
  maxTokens?: number
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  skipCache?: boolean
}

export interface AiGatewayResponse {
  response: string
  cacheHit: boolean
  cacheType: 'exact' | 'semantic' | null
  usage?: { inputTokens: number; outputTokens: number }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAiGateway() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  /**
   * Send a prompt to the AI Gateway.
   *
   * @param prompt - The user's question or instruction
   * @param contextTag - Determines system prompt and caching rules
   * @param options - Additional options (context, history, etc.)
   * @returns The AI response with cache metadata
   */
  const query = useCallback(
    async (
      prompt: string,
      contextTag: AiContextTag,
      options?: Omit<AiGatewayRequest, 'prompt' | 'contextTag'>
    ): Promise<AiGatewayResponse> => {
      setLoading(true)
      setError(null)

      // Cancel any in-flight request
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      try {
        const callable = httpsCallable<AiGatewayRequest, AiGatewayResponse>(
          functions,
          'aiGateway'
        )

        const result = await callable({
          prompt,
          contextTag,
          ...options,
        })

        setLoading(false)
        return result.data
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'AI request failed. Please try again.'

        // Don't set error state if the request was intentionally aborted
        if (message.includes('aborted')) {
          setLoading(false)
          throw err
        }

        setError(message)
        setLoading(false)
        throw err
      }
    },
    []
  )

  /**
   * Convenience: query for clinical guidelines (cached).
   */
  const askClinical = useCallback(
    (prompt: string, context?: string) =>
      query(prompt, 'clinical_guidelines', { context }),
    [query]
  )

  /**
   * Convenience: query for drug information (cached).
   */
  const askDrug = useCallback(
    (prompt: string) => query(prompt, 'drug_info'),
    [query]
  )

  /**
   * Convenience: query for lab analysis (patient-specific, not cached).
   */
  const analyzeLab = useCallback(
    (prompt: string, context: string) =>
      query(prompt, 'lab_analysis', { context, skipCache: true }),
    [query]
  )

  /**
   * Convenience: clinical chat with conversation history.
   */
  const chat = useCallback(
    (
      message: string,
      history: Array<{ role: 'user' | 'assistant'; content: string }>,
      patientContext?: string
    ) =>
      query(message, 'clinical_chat', {
        conversationHistory: history,
        context: patientContext,
        skipCache: true,
      }),
    [query]
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    query,
    askClinical,
    askDrug,
    analyzeLab,
    chat,
    loading,
    error,
    clearError,
  }
}

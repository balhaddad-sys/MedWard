import { searchShorthand, getShorthandByTrigger, MEDICAL_SHORTHAND } from '@/data/medicalShorthand'
import type { ShorthandEntry } from '@/data/medicalShorthand'

export interface SmartTextResult {
  original: string
  expanded: string
  matchedEntries: ShorthandEntry[]
}

export function expandSmartText(text: string): SmartTextResult {
  const words = text.split(/(\s+)/)
  const matchedEntries: ShorthandEntry[] = []
  const expanded = words.map((word) => {
    const trimmed = word.trim()
    if (!trimmed) return word
    const entry = getShorthandByTrigger(trimmed)
    if (entry) {
      matchedEntries.push(entry)
      return entry.expansion || entry.term
    }
    return word
  }).join('')

  return { original: text, expanded, matchedEntries }
}

export function searchMedicalTerms(query: string, limit = 10): ShorthandEntry[] {
  return searchShorthand(query, limit)
}

export function getCategoryTerms(type: ShorthandEntry['type']): ShorthandEntry[] {
  return MEDICAL_SHORTHAND.filter((s) => s.type === type)
}

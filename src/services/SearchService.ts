import Fuse from 'fuse.js'
import type { Patient } from '@/types'
import { ORDER_SETS } from '@/config/orderSets'
import { COMMON_DRUGS } from '@/config/commonDrugs'

/**
 * SearchService - Fuzzy search service using Fuse.js
 * Provides unified search across patients, calculators, protocols, and drugs
 */

export interface SearchItem {
  type: 'patient' | 'calculator' | 'protocol' | 'drug'
  id: string
  name: string
  description?: string
  category?: string
  // For patients
  mrn?: string
  bed?: string
}

export interface SearchResult extends SearchItem {
  score: number
}

/**
 * Build a Fuse.js search index with optimized options
 */
export function buildSearchIndex(items: SearchItem[]): Fuse<SearchItem> {
  return new Fuse(items, {
    threshold: 0.4,
    keys: [
      { name: 'name', weight: 2 },
      { name: 'description', weight: 1 },
      { name: 'mrn', weight: 1.5 },
      { name: 'bed', weight: 1 },
    ],
    includeScore: true,
  })
}

/**
 * Execute search and return top results
 */
export function search(
  fuse: Fuse<SearchItem>,
  query: string,
  limit: number = 10
): SearchResult[] {
  if (!query || query.trim().length === 0) {
    return []
  }

  const results = fuse.search(query)
  return results.slice(0, limit).map((result) => ({
    ...result.item,
    score: result.score || 0,
  }))
}

/**
 * Convert patients to search items
 */
export function buildPatientItems(patients: Patient[]): SearchItem[] {
  return patients.map((patient) => ({
    type: 'patient' as const,
    id: patient.id,
    name: `${patient.firstName} ${patient.lastName}`,
    description: patient.primaryDiagnosis,
    category: `Acuity ${patient.acuity}`,
    mrn: patient.mrn,
    bed: patient.bedNumber,
  }))
}

/**
 * Build calculator items from calculator registry
 * Note: CALCULATORS would need to be defined in a registry config
 */
export function buildCalculatorItems(): SearchItem[] {
  // Define calculator registry inline
  const CALCULATORS = [
    {
      id: 'news2',
      name: 'NEWS2 Calculator',
      description: 'National Early Warning Score 2',
    },
    {
      id: 'gcs',
      name: 'GCS Calculator',
      description: 'Glasgow Coma Scale',
    },
    {
      id: 'curb65',
      name: 'CURB-65 Calculator',
      description: 'Community-acquired pneumonia severity',
    },
    {
      id: 'map',
      name: 'MAP Calculator',
      description: 'Mean Arterial Pressure',
    },
    {
      id: 'corrected-calcium',
      name: 'Corrected Calcium Calculator',
      description: 'Adjust calcium for albumin',
    },
    {
      id: 'qtc',
      name: 'QTc Calculator',
      description: 'Corrected QT interval',
    },
    {
      id: 'gfr',
      name: 'GFR Calculator',
      description: 'Glomerular Filtration Rate',
    },
  ]

  return CALCULATORS.map((calc) => ({
    type: 'calculator' as const,
    id: calc.id,
    name: calc.name,
    description: calc.description,
    category: 'Clinical Tool',
  }))
}

/**
 * Build protocol items from ORDER_SETS
 */
export function buildProtocolItems(): SearchItem[] {
  return ORDER_SETS.map((orderSet) => ({
    type: 'protocol' as const,
    id: orderSet.id,
    name: orderSet.name,
    description: orderSet.description,
    category: orderSet.category,
  }))
}

/**
 * Build drug items from commonDrugs config
 */
export function buildDrugItems(): SearchItem[] {
  return COMMON_DRUGS.map((drug) => ({
    type: 'drug' as const,
    id: drug.name.toLowerCase().replace(/\s+/g, '-'),
    name: drug.name,
    description: `${drug.category} | Route: ${drug.route}${drug.commonDose ? ` | ${drug.commonDose}` : ''}`,
    category: drug.category,
  }))
}

/**
 * Build unified search index with all items
 */
export function buildUnifiedSearchIndex(
  patients: Patient[]
): Fuse<SearchItem> {
  const allItems: SearchItem[] = [
    ...buildPatientItems(patients),
    ...buildCalculatorItems(),
    ...buildProtocolItems(),
    ...buildDrugItems(),
  ]

  return buildSearchIndex(allItems)
}

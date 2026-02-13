import { useEffect, useRef, useState } from 'react'
import { Search, User, Calculator, Shield, Pill, X } from 'lucide-react'
import { clsx } from 'clsx'
import type { Patient } from '@/types'
import {
  buildUnifiedSearchIndex,
  search,
  type SearchResult,
} from '@/services/SearchService'

interface GlobalSearchProps {
  patients: Patient[]
  onSelectPatient: (patient: Patient) => void
  onSelectCalculator: (calcId: string) => void
  onSelectProtocol: (protocolId: string) => void
  onSelectDrug: (drugName: string) => void
}

/**
 * Global search bar component with results dropdown
 * Supports fuzzy search across patients, calculators, protocols, and drugs
 */
export function GlobalSearch({
  patients,
  onSelectPatient,
  onSelectCalculator,
  onSelectProtocol,
  onSelectDrug,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Build search index from patients
  const fuse = buildUnifiedSearchIndex(patients)

  // Handle search with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        const searchResults = search(fuse, query, 10)
        setResults(searchResults)
        setIsOpen(true)
        setSelectedIndex(0)
      }, 300)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [query, fuse])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K to focus
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }

      // Navigation in dropdown
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          setIsOpen(false)
          setQuery('')
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex])
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !searchInputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectResult = (result: SearchResult) => {
    const patient = patients.find(
      (p) => p.id === result.id && result.type === 'patient'
    )

    if (patient) {
      onSelectPatient(patient)
    } else if (result.type === 'calculator') {
      onSelectCalculator(result.id)
    } else if (result.type === 'protocol') {
      onSelectProtocol(result.id)
    } else if (result.type === 'drug') {
      onSelectDrug(result.name)
    }

    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  const getTypeIcon = (type: SearchResult['type']) => {
    const iconProps = 'w-4 h-4'
    switch (type) {
      case 'patient':
        return <User className={iconProps} />
      case 'calculator':
        return <Calculator className={iconProps} />
      case 'protocol':
        return <Shield className={iconProps} />
      case 'drug':
        return <Pill className={iconProps} />
    }
  }

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'patient':
        return 'text-blue-400'
      case 'calculator':
        return 'text-green-400'
      case 'protocol':
        return 'text-purple-400'
      case 'drug':
        return 'text-orange-400'
    }
  }

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = []
      }
      acc[result.type].push(result)
      return acc
    },
    {} as Record<string, SearchResult[]>
  )

  const typeOrder: Array<SearchResult['type']> = [
    'patient',
    'protocol',
    'calculator',
    'drug',
  ]

  return (
    <div className="sticky top-0 z-50 px-4 py-3 bg-slate-800 border-b border-slate-700">
      <div className="max-w-6xl mx-auto">
        <div className="relative">
          {/* Search input */}
          <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <Search className="w-5 h-5 text-slate-400 mr-2 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search patients, protocols, tools... (Cmd+K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-400 text-sm"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  setResults([])
                  setIsOpen(false)
                }}
                className="ml-2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-96 overflow-y-auto"
            >
              {results.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                  No results found for "{query}"
                </div>
              ) : (
                <div>
                  {typeOrder.map((type) => {
                    const typeResults = groupedResults[type]
                    if (!typeResults) return null

                    const typeLabels: Record<SearchResult['type'], string> = {
                      patient: 'Patients',
                      protocol: 'Protocols',
                      calculator: 'Calculators',
                      drug: 'Drugs',
                    }

                    return (
                      <div key={type}>
                        {/* Type header */}
                        <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase bg-slate-700/50 sticky top-0">
                          {typeLabels[type]}
                        </div>

                        {/* Type results */}
                        {typeResults.map((result, idx) => {
                          const resultIndex =
                            results.findIndex((r) => r.id === result.id)

                          return (
                            <button
                              key={result.id}
                              onClick={() => handleSelectResult(result)}
                              className={clsx(
                                'w-full px-4 py-3 text-left border-b border-slate-700 last:border-b-0 transition-colors',
                                resultIndex === selectedIndex
                                  ? 'bg-blue-900/50'
                                  : 'hover:bg-slate-700/50'
                              )}
                            >
                              <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div
                                  className={clsx(
                                    'flex-shrink-0 mt-1',
                                    getTypeColor(result.type)
                                  )}
                                >
                                  {getTypeIcon(result.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-100 truncate">
                                    {result.name}
                                  </div>
                                  {result.description && (
                                    <div className="text-xs text-slate-400 truncate">
                                      {result.description}
                                    </div>
                                  )}
                                  {result.category && (
                                    <div className="inline-block mt-1 px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                                      {result.category}
                                    </div>
                                  )}
                                </div>

                                {/* MRN and bed for patients */}
                                {result.type === 'patient' && (
                                  <div className="flex-shrink-0 text-right">
                                    {result.mrn && (
                                      <div className="text-xs text-slate-400">
                                        MRN: {result.mrn}
                                      </div>
                                    )}
                                    {result.bed && (
                                      <div className="text-xs text-slate-400">
                                        Bed: {result.bed}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Keyboard hint */}
        {!query && !isOpen && (
          <div className="mt-2 text-xs text-slate-500 text-right">
            Press Cmd+K to search
          </div>
        )}
      </div>
    </div>
  )
}

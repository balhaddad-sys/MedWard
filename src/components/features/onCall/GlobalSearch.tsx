import { useCallback, useEffect, useRef, useState } from 'react'
import { SearchIcon, PillIcon, CloseIcon } from '@/components/icons/MedicalIcons'
import { clsx } from 'clsx'
import type { Patient } from '@/types'
import {
  buildUnifiedSearchIndex,
  search,
  type SearchResult,
} from '@/services/SearchService'
import { BedPatientIcon, StethoscopeIcon, SyringeIcon } from '@/components/icons/MedicalIcons'

interface GlobalSearchProps {
  patients: Patient[]
  onSelectPatient: (patient: Patient) => void
  onSelectCalculator: (calcId: string) => void
  onSelectProtocol: (protocolId: string) => void
  onSelectDrug: (drugName: string) => void
}

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fuse = buildUnifiedSearchIndex(patients)

  const handleSelectResult = useCallback((result: SearchResult) => {
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
  }, [patients, onSelectPatient, onSelectCalculator, onSelectProtocol, onSelectDrug])

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (newQuery.length >= 2) {
      debounceRef.current = setTimeout(() => {
        const searchResults = search(fuse, newQuery, 10)
        setResults(searchResults)
        setIsOpen(true)
        setSelectedIndex(0)
      }, 300)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [fuse])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }

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
  }, [isOpen, results, selectedIndex, handleSelectResult])

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

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'patient':
        return <BedPatientIcon className="w-4 h-4" />
      case 'calculator':
        return <StethoscopeIcon className="w-4 h-4" />
      case 'protocol':
        return <SyringeIcon className="w-4 h-4" />
      case 'drug':
        return <PillIcon className="w-4 h-4" />
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
    <div className="relative">
      <div>
        <div className="relative">
          {/* Search input */}
          <div className="flex items-center bg-slate-800/60 border border-slate-600/50 rounded-xl px-3 py-2.5 shadow-sm focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/30 focus-within:shadow-[0_0_12px_rgba(245,158,11,0.1)] transition-all">
            <SearchIcon className="w-5 h-5 text-slate-400 mr-2 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search patients, protocols, tools..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-400 text-sm"
            />
            {query && (
              <button
                onClick={() => handleQueryChange('')}
                className="ml-2 text-slate-400 hover:text-slate-200"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50"
            >
              {results.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                  No results found for &quot;{query}&quot;
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
                        <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60 sticky top-0 backdrop-blur-sm">
                          {typeLabels[type]}
                        </div>

                        {typeResults.map((result) => {
                          const resultIndex =
                            results.findIndex((r) => r.id === result.id)

                          return (
                            <button
                              key={result.id}
                              onClick={() => handleSelectResult(result)}
                              className={clsx(
                                'w-full px-4 py-3 text-left border-b border-slate-700/40 last:border-b-0 transition-colors',
                                resultIndex === selectedIndex
                                  ? 'bg-amber-500/10'
                                  : 'hover:bg-slate-800/60'
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={clsx(
                                    'flex-shrink-0 mt-1',
                                    getTypeColor(result.type)
                                  )}
                                >
                                  {getTypeIcon(result.type)}
                                </div>

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
                                    <div className="inline-block mt-1 px-2 py-0.5 bg-slate-700/50 rounded-full text-[10px] text-slate-300">
                                      {result.category}
                                    </div>
                                  )}
                                </div>

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

        {!query && !isOpen && (
          <div className="mt-1.5 text-[10px] text-slate-500 text-right hidden sm:block">
            Cmd+K to search
          </div>
        )}
      </div>
    </div>
  )
}

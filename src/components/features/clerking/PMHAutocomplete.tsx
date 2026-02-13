import { useRef, useState } from 'react'
import { X, Search } from 'lucide-react'
import { clsx } from 'clsx'
import Fuse from 'fuse.js'
import { PMH_CONDITIONS, type PMHCondition } from '@/config/pmhConditions'

interface PMHAutocompleteProps {
  selectedConditions: string[]
  onAdd: (condition: string) => void
  onRemove: (condition: string) => void
}

/**
 * Fuzzy-searchable PMH condition selector
 * Allows adding/removing conditions with autocomplete
 */
export function PMHAutocomplete({
  selectedConditions,
  onAdd,
  onRemove,
}: PMHAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredResults, setFilteredResults] = useState<PMHCondition[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Build Fuse index
  const fuse = new Fuse(PMH_CONDITIONS, {
    keys: ['name', 'abbreviation', 'category'],
    threshold: 0.3,
  })

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value)

    if (value.trim().length === 0) {
      setFilteredResults([])
      setIsOpen(false)
    } else {
      const results = fuse
        .search(value)
        .map((result) => result.item)
        .filter((cond) => !selectedConditions.includes(cond.name))
        .slice(0, 8)

      setFilteredResults(results)
      setIsOpen(true)
    }
  }

  const handleSelectCondition = (condition: PMHCondition) => {
    onAdd(condition.name)
    setSearchQuery('')
    setFilteredResults([])
    setIsOpen(false)
  }

  const handleAddCustom = (value: string) => {
    if (value.trim() && !selectedConditions.includes(value.trim())) {
      onAdd(value.trim())
      setSearchQuery('')
      setFilteredResults([])
      setIsOpen(false)
    }
  }

  // Get selected condition objects for display
  const selectedObjects = selectedConditions
    .map((name) => PMH_CONDITIONS.find((c) => c.name === name) || { name })
    .filter(Boolean)

  const categoryColors: Record<string, string> = {
    cardiac: 'bg-red-900/30 text-red-300 border-red-700',
    respiratory: 'bg-blue-900/30 text-blue-300 border-blue-700',
    metabolic: 'bg-orange-900/30 text-orange-300 border-orange-700',
    renal: 'bg-cyan-900/30 text-cyan-300 border-cyan-700',
    neurological: 'bg-purple-900/30 text-purple-300 border-purple-700',
    GI: 'bg-green-900/30 text-green-300 border-green-700',
    musculoskeletal: 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
    haematological: 'bg-pink-900/30 text-pink-300 border-pink-700',
    psychiatric: 'bg-indigo-900/30 text-indigo-300 border-indigo-700',
    other: 'bg-slate-700 text-slate-200 border-slate-600',
  }

  return (
    <div className="w-full">
      {/* Selected conditions */}
      {selectedConditions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedObjects.map((condition) => (
            <div
              key={condition.name}
              className={clsx(
                'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border',
                categoryColors[
                  (condition as PMHCondition).category || 'other'
                ] || categoryColors.other
              )}
            >
              <span>{condition.name}</span>
              <button
                onClick={() => onRemove(condition.name)}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Add past medical history..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length > 0) {
                setIsOpen(true)
              }
            }}
            className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-400 text-sm"
          />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10"
          >
            {filteredResults.length > 0 ? (
              <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                {filteredResults.map((condition) => (
                  <button
                    key={condition.name}
                    onClick={() => handleSelectCondition(condition)}
                    className={clsx(
                      'w-full text-left px-3 py-2 rounded transition-colors hover:bg-slate-700/50',
                      categoryColors[condition.category] ||
                        categoryColors.other
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{condition.name}</div>
                        {condition.abbreviation && (
                          <div className="text-xs opacity-70">
                            {condition.abbreviation}
                          </div>
                        )}
                      </div>
                      <div className="text-xs opacity-60">{condition.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.trim().length > 0 ? (
              <div className="p-4">
                <div className="text-slate-400 text-sm mb-3">
                  No matching conditions found
                </div>
                <button
                  onClick={() => handleAddCustom(searchQuery)}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Add "{searchQuery}" as custom
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Helper text */}
      <div className="mt-2 text-xs text-slate-400">
        Search by condition name, abbreviation, or category
      </div>
    </div>
  )
}

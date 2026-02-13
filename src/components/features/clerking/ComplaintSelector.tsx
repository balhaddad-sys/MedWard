import { useRef, useState } from 'react'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import { COMPLAINT_TEMPLATES, type ComplaintTemplate } from '@/config/complaintTemplates'

interface ComplaintSelectorProps {
  onSelect: (template: ComplaintTemplate) => void
  currentComplaint?: string
}

/**
 * Searchable complaint template selector
 * Compact inline component for selecting from predefined complaint templates
 */
export function ComplaintSelector({
  onSelect,
  currentComplaint,
}: ComplaintSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter templates based on search
  const filteredTemplates = COMPLAINT_TEMPLATES.filter(
    (template) =>
      template.complaint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedTemplate = COMPLAINT_TEMPLATES.find(
    (t) => t.complaint === currentComplaint
  )

  const handleSelectTemplate = (template: ComplaintTemplate) => {
    onSelect(template)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="relative w-full">
      {/* Main button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full flex items-center justify-between px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg',
          'hover:border-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
          'transition-colors text-left'
        )}
      >
        <div className="flex-1">
          <div className="text-sm text-slate-400">Chief Complaint</div>
          <div className="text-slate-100 font-medium">
            {selectedTemplate ? selectedTemplate.complaint : 'Select complaint...'}
          </div>
        </div>
        <ChevronDown
          className={clsx('w-5 h-5 text-slate-400 transition-transform', {
            'rotate-180': isOpen,
          })}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10"
        >
          {/* Search input */}
          <div className="p-2 border-b border-slate-700">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search complaints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 placeholder-slate-400 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                No complaints found
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-700/50 rounded transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-slate-100 text-sm">
                          {template.complaint}
                        </div>
                        <div className="text-xs text-slate-400">
                          {template.category}
                        </div>
                      </div>
                      {template.redFlags.length > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0 text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span className="text-xs font-semibold">
                            {template.redFlags.length}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Custom option */}
            {searchQuery && filteredTemplates.length === 0 && (
              <button
                onClick={() => {
                  onSelect({
                    id: 'custom',
                    complaint: searchQuery,
                    category: 'Custom',
                    promptFields: [],
                    suggestedExams: [],
                    redFlags: [],
                    suggestedInvestigations: [],
                    differentials: [],
                  })
                  setIsOpen(false)
                  setSearchQuery('')
                }}
                className="w-full text-left px-4 py-3 text-blue-400 hover:bg-slate-700/50 border-t border-slate-700 transition-colors text-sm font-medium"
              >
                Use "{searchQuery}" as custom complaint
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

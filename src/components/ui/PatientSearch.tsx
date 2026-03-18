import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, BedDouble } from 'lucide-react'
import { clsx } from 'clsx'
import { usePatientStore } from '@/stores/patientStore'

export function PatientSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const patients = usePatientStore((s) => s.patients)
  const navigate = useNavigate()

  const filtered = query.trim()
    ? patients.filter((p) => {
        const q = query.toLowerCase()
        return (
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          `${p.lastName}, ${p.firstName}`.toLowerCase().includes(q) ||
          p.mrn?.toLowerCase().includes(q) ||
          p.bedNumber?.toLowerCase().includes(q) ||
          p.primaryDiagnosis?.toLowerCase().includes(q)
        )
      }).slice(0, 8)
    : patients.slice(0, 8)

  const handleOpen = useCallback(() => {
    setOpen(true)
    setQuery('')
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        handleOpen()
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, handleOpen])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function selectPatient(id: string) {
    setOpen(false)
    navigate(`/patients/${id}`)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Search panel */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients by name, MRN, bed, or diagnosis..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
          />
          <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              No patients found
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPatient(p.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 text-left',
                  'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                  'border-b border-slate-50 dark:border-slate-800/50 last:border-b-0',
                )}
              >
                <div className={clsx(
                  'flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold shrink-0',
                  p.acuity <= 2
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                    : p.acuity === 3
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
                )}>
                  {p.acuity}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {p.lastName}, {p.firstName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {p.primaryDiagnosis || 'No diagnosis'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                  <BedDouble size={12} />
                  <span className="font-medium">{p.bedNumber}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-3">
          <span><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">↵</kbd> to select</span>
          <span><kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">esc</kbd> to close</span>
        </div>
      </div>
    </div>
  )
}

/** Trigger button for the search - use in TopBar */
export function PatientSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
        'hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
        'border border-slate-200 dark:border-slate-700',
      )}
    >
      <Search size={14} />
      <span className="hidden sm:inline">Search patients...</span>
      <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">⌘K</kbd>
    </button>
  )
}

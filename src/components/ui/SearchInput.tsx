import { useState, useRef } from 'react'
import { clsx } from 'clsx'
import { Search, X } from 'lucide-react'

export interface SearchInputProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
  autoFocus?: boolean
}

export function SearchInput({
  value: controlledValue,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className,
  autoFocus = false,
}: SearchInputProps) {
  const displayValue = controlledValue !== undefined ? controlledValue : undefined
  const [localValue, setLocalValue] = useState(controlledValue ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Derive the current value without an effect
  const currentValue = displayValue !== undefined ? displayValue : localValue

  const handleChange = (val: string) => {
    setLocalValue(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onChange(val)
    }, debounceMs)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div className={clsx('relative', className)}>
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={clsx(
          'w-full h-10 pl-10 pr-10 rounded-lg border border-slate-200 bg-white',
          'text-sm text-slate-900 placeholder:text-slate-400',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400',
          'hover:border-slate-300'
        )}
      />
      {currentValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

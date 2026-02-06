import { useState, useRef, useCallback } from 'react'
import { searchShorthand } from '@/data/medicalShorthand'
import type { ShorthandEntry } from '@/data/medicalShorthand'
import { clsx } from 'clsx'

interface SmartPlanEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const typeColors: Record<string, { bg: string; text: string; dot: string }> = {
  lab: { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  imaging: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  med: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  action: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  template: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
}

export function SmartPlanEditor({ value, onChange, placeholder }: SmartPlanEditorProps) {
  const [suggestions, setSuggestions] = useState<ShorthandEntry[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const getCurrentWord = useCallback((text: string, position: number) => {
    const beforeCursor = text.slice(0, position)
    const words = beforeCursor.split(/[\s\n]+/)
    return words[words.length - 1] || ''
  }, [])

  const insertSuggestion = useCallback(
    (suggestion: ShorthandEntry) => {
      const text = value
      const beforeCursor = text.slice(0, cursorPosition)
      const afterCursor = text.slice(cursorPosition)
      const lastSpaceIndex = Math.max(beforeCursor.lastIndexOf(' '), beforeCursor.lastIndexOf('\n'))
      const startOfWord = lastSpaceIndex === -1 ? 0 : lastSpaceIndex + 1
      const textToInsert = suggestion.expansion || suggestion.term
      const newText = text.slice(0, startOfWord) + textToInsert + ' ' + afterCursor.trimStart()
      onChange(newText)
      setSuggestions([])
      setTimeout(() => {
        const newPosition = startOfWord + textToInsert.length + 1
        textareaRef.current?.setSelectionRange(newPosition, newPosition)
        textareaRef.current?.focus()
      }, 10)
    },
    [value, cursorPosition, onChange]
  )

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    const position = e.target.selectionStart
    onChange(text)
    setCursorPosition(position)
    const currentWord = getCurrentWord(text, position)
    if (currentWord.length === 0) { setSuggestions([]); return }
    const matches = searchShorthand(currentWord, 5)
    setSuggestions(matches)
    setSelectedIndex(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length === 0) return
    switch (e.key) {
      case 'Tab':
      case 'Enter':
        if (suggestions.length > 0) { e.preventDefault(); insertSuggestion(suggestions[selectedIndex]) }
        break
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Escape':
        setSuggestions([])
        break
    }
  }

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type 'cbc' for labs, 'vanc' for meds, '.sepsis' for protocols..."}
        className="w-full min-h-[120px] p-4 border border-ward-border rounded-xl font-mono text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none resize-y bg-white"
      />

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border border-ward-border rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2 bg-gray-50 border-b border-ward-border flex justify-between items-center">
            <span className="text-xs font-semibold text-ward-muted uppercase tracking-wide">Suggestions</span>
            <span className="text-xs text-ward-muted">Tab to select</span>
          </div>
          {suggestions.map((s, idx) => {
            const colors = typeColors[s.type] || typeColors.action
            const isSelected = idx === selectedIndex
            return (
              <button
                key={s.trigger}
                onClick={() => insertSuggestion(s)}
                className={clsx(
                  'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
                  isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                )}
              >
                <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', colors.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ward-text">{s.term}</span>
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded', colors.bg, colors.text)}>{s.trigger}</span>
                  </div>
                  {s.detail && <div className="text-xs text-ward-muted truncate">{s.detail}</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="md:hidden flex gap-2 mt-2 overflow-x-auto pb-2">
          {suggestions.slice(0, 4).map((s) => {
            const colors = typeColors[s.type] || typeColors.action
            return (
              <button
                key={s.trigger}
                onClick={() => insertSuggestion(s)}
                className={clsx('flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium', colors.bg, colors.text)}
              >
                {s.term}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

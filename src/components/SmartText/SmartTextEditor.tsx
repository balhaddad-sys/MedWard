import { useState, useRef, useEffect, useCallback } from 'react'
import { FileText, X, Hash, Clock, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { smartTextService } from '@/services/SmartTextService'
import type { SmartTextPhrase } from '@/services/SmartTextService'
import { triggerHaptic } from '@/utils/haptics'

interface SmartTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  userId?: string
}

export function SmartTextEditor({
  value,
  onChange,
  placeholder = 'Start typing... Use .abbreviation for SmartText',
  className,
  userId = 'unknown',
}: SmartTextEditorProps) {
  const [suggestions, setSuggestions] = useState<SmartTextPhrase[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cursorWord, setCursorWord] = useState('')
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })
  const [initialized, setInitialized] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize service
  useEffect(() => {
    smartTextService.init(userId).then(() => setInitialized(true))
  }, [userId])

  // Get top phrases for QuickBar
  const topPhrases = initialized ? smartTextService.getTopPhrases(3) : []

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      onChange(newValue)

      if (!initialized) return

      // Get word at cursor
      const textarea = e.target
      const cursorPos = textarea.selectionStart
      const textBefore = newValue.slice(0, cursorPos)
      const words = textBefore.split(/\s/)
      const currentWord = words[words.length - 1] || ''

      setCursorWord(currentWord)

      const prefix = smartTextService.getTriggerPrefix()
      if (currentWord.startsWith(prefix) && currentWord.length > prefix.length) {
        const results = smartTextService.search(currentWord)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)

        // Calculate popover position
        updatePopoverPosition(textarea, cursorPos)
      } else if (currentWord === prefix) {
        // Show all phrases on just "."
        const results = smartTextService.search(currentWord)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        updatePopoverPosition(textarea, cursorPos)
      } else {
        setShowSuggestions(false)
      }
    },
    [onChange, initialized]
  )

  const updatePopoverPosition = (textarea: HTMLTextAreaElement, cursorPos: number) => {
    // Approximate position based on character count
    const lineHeight = 20
    const charWidth = 8
    const textBefore = textarea.value.slice(0, cursorPos)
    const lines = textBefore.split('\n')
    const currentLine = lines.length - 1
    const colInLine = lines[lines.length - 1].length

    const rect = textarea.getBoundingClientRect()
    const scrollTop = textarea.scrollTop

    setPopoverPosition({
      top: Math.min(
        rect.height - 200,
        currentLine * lineHeight - scrollTop + lineHeight + 8
      ),
      left: Math.min(rect.width - 200, colInLine * charWidth),
    })
  }

  const insertPhrase = useCallback(
    (phrase: SmartTextPhrase) => {
      triggerHaptic('tap')
      smartTextService.recordUsage(phrase.abbreviation, userId)

      const textarea = textareaRef.current
      if (!textarea) return

      const cursorPos = textarea.selectionStart
      const textBefore = value.slice(0, cursorPos)
      const textAfter = value.slice(cursorPos)

      // Find start of trigger word
      const words = textBefore.split(/\s/)
      const lastWord = words[words.length - 1] || ''
      const wordStart = cursorPos - lastWord.length

      // Replace trigger word with phrase content
      const newValue =
        value.slice(0, wordStart) + phrase.content + textAfter

      onChange(newValue)
      setShowSuggestions(false)

      // Move cursor to end of inserted content
      requestAnimationFrame(() => {
        if (textarea) {
          const newPos = wordStart + phrase.content.length
          textarea.selectionStart = newPos
          textarea.selectionEnd = newPos
          textarea.focus()
        }
      })
    },
    [value, onChange, userId]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions) return

      if (e.key === 'Escape') {
        e.preventDefault()
        setShowSuggestions(false)
      }

      if (e.key === 'Tab' || e.key === 'Enter') {
        if (suggestions.length > 0) {
          e.preventDefault()
          insertPhrase(suggestions[0])
        }
      }
    },
    [showSuggestions, suggestions, insertPhrase]
  )

  return (
    <div className={clsx('relative', className)}>
      {/* QuickBar — Top 3 Most-Used Phrases */}
      {topPhrases.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto scrollbar-hide">
          <Hash className="h-3.5 w-3.5 text-ward-muted flex-shrink-0" />
          {topPhrases.map((phrase) => (
            <button
              key={phrase.id}
              onClick={() => insertPhrase(phrase)}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium text-stone-600 whitespace-nowrap transition-colors touch flex-shrink-0"
            >
              <span className="text-stone-400">.{phrase.abbreviation}</span>
              <span className="text-stone-700">{phrase.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowSuggestions(false), 200)
          }}
          placeholder={placeholder}
          className="w-full min-h-[300px] p-4 text-sm leading-relaxed resize-y border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent placeholder:text-stone-300"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        />

        {/* Suggestions Popover */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            className="absolute z-20 w-72 max-h-60 overflow-y-auto bg-white rounded-xl shadow-lg border border-ward-border animate-fade-in"
            style={{
              top: `${Math.max(0, popoverPosition.top)}px`,
              left: `${Math.max(0, popoverPosition.left)}px`,
            }}
          >
            <div className="p-1">
              {suggestions.map((phrase, idx) => (
                <button
                  key={phrase.id}
                  onClick={() => insertPhrase(phrase)}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors touch',
                    idx === 0 ? 'bg-primary-50' : 'hover:bg-gray-50'
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-primary-600">
                        .{phrase.abbreviation}
                      </span>
                      <span className="text-xs font-medium text-ward-text truncate">
                        {phrase.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-ward-muted truncate mt-0.5">
                      {phrase.content.slice(0, 60)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {phrase.usageCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-ward-muted">
                        <Clock className="h-2.5 w-2.5" />
                        {phrase.usageCount}
                      </span>
                    )}
                    <ChevronRight className="h-3 w-3 text-ward-muted" />
                  </div>
                </button>
              ))}
            </div>
            <div className="px-3 py-1.5 border-t border-ward-border bg-gray-50 rounded-b-xl">
              <span className="text-[10px] text-ward-muted">
                Tab to insert | Esc to dismiss
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1 text-[10px] text-ward-muted">
          <FileText className="h-3 w-3" />
          <span>{value.length} characters</span>
        </div>
        <span className="text-[10px] text-ward-muted">
          Type <span className="font-mono font-bold">.abbreviation</span> for SmartText
        </span>
      </div>
    </div>
  )
}

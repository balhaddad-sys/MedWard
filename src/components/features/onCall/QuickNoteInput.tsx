import { useState } from 'react'
import { Send } from 'lucide-react'
import { triggerHaptic } from '@/utils/haptics'

interface QuickNoteInputProps {
  onAdd: (text: string) => void
  placeholder?: string
}

export function QuickNoteInput({
  onAdd,
  placeholder = 'Add a quick note...',
}: QuickNoteInputProps) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return

    triggerHaptic('success')
    onAdd(trimmed)
    setText('')
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex gap-2 items-end">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        rows={2}
        className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-slate-500 min-h-[44px]"
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="px-4 py-2 min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}

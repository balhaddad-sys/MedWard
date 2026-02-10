import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  Trash2,
  Pill,
  ArrowRightLeft,
  Stethoscope,
  FlaskConical,
  Search,
  Activity,
  Bot,
  User,
  AlertTriangle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { clinicalAIService } from '@/services/ClinicalAIService'
import type { ChatMessage } from '@/services/ClinicalAIService'
import { DrugInformationCard } from './DrugInformationCard'
import { triggerHaptic, hapticPatterns } from '@/utils/haptics'
import { Markdown } from '@/components/ui/Markdown'
import type { PatientContext } from '@/services/ClinicalAIService'

interface ClinicalChatInterfaceProps {
  patientContext?: PatientContext
  patientName?: string
}

const quickActions = [
  { icon: Pill, label: 'Drug Info', prompt: 'Provide structured drug information for:', color: 'text-blue-600 bg-blue-50' },
  { icon: ArrowRightLeft, label: 'Interactions', prompt: 'Check drug interactions between:', color: 'text-purple-600 bg-purple-50' },
  { icon: Activity, label: 'Dosing', prompt: 'Provide dosing guidance for:', color: 'text-green-600 bg-green-50' },
  { icon: AlertTriangle, label: 'Side Effects', prompt: 'List side effects and management for:', color: 'text-amber-600 bg-amber-50' },
  { icon: Stethoscope, label: 'Differential Dx', prompt: 'Generate a differential diagnosis for:', color: 'text-red-600 bg-red-50' },
  { icon: FlaskConical, label: 'Lab Interpret', prompt: 'Interpret these lab results:', color: 'text-cyan-600 bg-cyan-50' },
]

export function ClinicalChatInterface({ patientContext, patientName }: ClinicalChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(
    async (text?: string) => {
      const prompt = text || input.trim()
      if (!prompt || loading) return

      triggerHaptic('tap')

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setLoading(true)

      // Auto-resize textarea back to initial
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }

      try {
        const response = await clinicalAIService.sendMessage(prompt, patientContext)

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.text,
          timestamp: new Date(),
          drugInfo: response.drugInfo,
        }
        setMessages((prev) => [...prev, aiMsg])
      } catch (error) {
        hapticPatterns.errorOccurred()
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'Failed to get response. Please try again.',
          timestamp: new Date(),
          isError: true,
        }
        setMessages((prev) => [...prev, errorMsg])
      } finally {
        setLoading(false)
      }
    },
    [input, loading, patientContext]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    triggerHaptic('tap')
    setMessages([])
    clinicalAIService.clearHistory()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] sm:h-[calc(100vh-160px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-ward-text flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary-600" />
            Clinical AI
          </h2>
          <p className="text-xs text-ward-muted">Evidence-based decision support</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ward-muted hover:bg-gray-100 transition-colors touch"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Patient Context Badge */}
      {patientName && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-primary-50 rounded-lg border border-primary-100 flex-shrink-0">
          <User className="h-3.5 w-3.5 text-primary-600" />
          <span className="text-xs font-medium text-primary-700">
            Patient: {patientName}
          </span>
          {patientContext?.renal && patientContext.renal !== 'normal' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">
              Renal: {patientContext.renal}
            </span>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-4">
        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-16 w-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-base font-semibold text-ward-text mb-2">
              How can I help?
            </h3>
            <p className="text-xs text-ward-muted mb-6 max-w-sm">
              Ask about medications, lab interpretation, differentials, or clinical guidelines.
            </p>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-md">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    triggerHaptic('tap')
                    setInput(action.prompt + ' ')
                    inputRef.current?.focus()
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-ward-border bg-white hover:shadow-sm transition-all touch"
                >
                  <div
                    className={clsx(
                      'h-10 w-10 rounded-xl flex items-center justify-center',
                      action.color
                    )}
                  >
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-ward-text">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message List */
          messages.map((msg) => (
            <div key={msg.id}>
              {/* Message bubble */}
              <div
                className={clsx(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={clsx(
                    'max-w-[90%] sm:max-w-[80%]',
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-2xl rounded-br-md px-4 py-3'
                      : msg.isError
                        ? 'bg-red-50 border border-red-200 rounded-2xl rounded-bl-md px-4 py-3'
                        : 'bg-white border border-ward-border rounded-2xl rounded-bl-md px-4 py-3'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot
                        className={clsx(
                          'h-3.5 w-3.5',
                          msg.isError ? 'text-red-500' : 'text-primary-600'
                        )}
                      />
                      <span
                        className={clsx(
                          'text-[10px] font-bold',
                          msg.isError ? 'text-red-500' : 'text-primary-600'
                        )}
                      >
                        {msg.isError ? 'Error' : 'AI Assistant'}
                      </span>
                    </div>
                  )}
                  {!msg.drugInfo && (
                    msg.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap text-white">
                        {msg.content}
                      </p>
                    ) : (
                      <Markdown
                        content={msg.content}
                        className={msg.isError ? 'text-red-700' : 'text-ward-text'}
                      />
                    )
                  )}
                  <p
                    className={clsx(
                      'text-[10px] mt-1.5',
                      msg.role === 'user'
                        ? 'text-white/70'
                        : msg.isError
                          ? 'text-red-400'
                          : 'text-ward-muted'
                    )}
                  >
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {/* Inline Drug Card */}
              {msg.drugInfo && (
                <div className="mt-2 max-w-[90%] sm:max-w-[80%]">
                  <DrugInformationCard
                    drug={msg.drugInfo}
                    patientContext={patientContext}
                  />
                </div>
              )}

              {/* Retry button on error */}
              {msg.isError && (
                <div className="mt-2">
                  <button
                    onClick={() => {
                      // Find last user message and retry
                      const lastUserMsg = [...messages]
                        .reverse()
                        .find((m) => m.role === 'user')
                      if (lastUserMsg) {
                        setMessages((prev) => prev.filter((m) => m.id !== msg.id))
                        handleSend(lastUserMsg.content)
                      }
                    }}
                    className="text-xs text-primary-600 font-medium hover:underline touch"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-ward-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-primary-600" />
                <div className="flex gap-1">
                  <span
                    className="h-2 w-2 bg-primary-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="h-2 w-2 bg-primary-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="h-2 w-2 bg-primary-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Disclaimer */}
      <div className="flex-shrink-0 mb-2">
        <p className="text-[10px] text-ward-muted text-center italic">
          AI-generated content is for clinical decision support only. Always verify with primary sources.
        </p>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a clinical question..."
            rows={1}
            className="input-field w-full resize-none pr-4 min-h-[44px] max-h-[120px]"
            style={{ height: 'auto', minHeight: '44px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 120) + 'px'
            }}
          />
        </div>
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className={clsx(
            'flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] transition-colors touch',
            input.trim() && !loading
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

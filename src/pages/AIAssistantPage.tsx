import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Trash2, Sparkles, Stethoscope, Pill, FlaskConical, ClipboardList } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { callAI } from '@/services/ai/claude'
import { Markdown } from '@/components/ui/Markdown'
import { clsx } from 'clsx'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const quickPrompts = [
  { icon: <Stethoscope className="h-4 w-4" />, label: 'Differential Diagnosis', prompt: 'Help me generate a differential diagnosis for a patient presenting with:' },
  { icon: <Pill className="h-4 w-4" />, label: 'Drug Information', prompt: 'Provide clinical information about this medication including dosing, interactions, and side effects:' },
  { icon: <FlaskConical className="h-4 w-4" />, label: 'Lab Interpretation', prompt: 'Help me interpret these lab results and their clinical significance:' },
  { icon: <ClipboardList className="h-4 w-4" />, label: 'Clinical Guidelines', prompt: 'Summarize the current clinical guidelines for managing:' },
]

export function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text?: string) => {
    const prompt = text || input.trim()
    if (!prompt || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await callAI({
        prompt,
        context: 'You are a clinical decision support AI assistant for healthcare professionals. Provide evidence-based information. Always remind that AI suggestions should be verified with clinical judgment and primary sources.',
        maxTokens: 2048,
      })
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please check that the AI service is configured and try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    setMessages([])
    setInput('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-100px)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ward-text flex items-center gap-2">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" /> AI Assistant
          </h1>
          <p className="text-sm text-ward-muted mt-1">Clinical decision support powered by AI</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-16 w-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-ward-text mb-2">How can I help?</h2>
            <p className="text-sm text-ward-muted mb-6 max-w-md">
              Ask me about differential diagnoses, drug information, lab interpretations, clinical guidelines, and more.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {quickPrompts.map((qp) => (
                <Card
                  key={qp.label}
                  hover
                  padding="sm"
                  onClick={() => {
                    setInput(qp.prompt + ' ')
                    inputRef.current?.focus()
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 text-primary-600">
                      {qp.icon}
                    </div>
                    <span className="text-sm font-medium text-ward-text">{qp.label}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={clsx(
                  'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-white border border-ward-border rounded-bl-md'
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Bot className="h-3.5 w-3.5 text-primary-600" />
                    <span className="text-xs font-medium text-primary-600">AI Assistant</span>
                  </div>
                )}
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap text-white">
                    {msg.content}
                  </p>
                ) : (
                  <Markdown content={msg.content} className="text-ward-text" />
                )}
                <p className={clsx(
                  'text-[10px] mt-1.5',
                  msg.role === 'user' ? 'text-white/70' : 'text-ward-muted'
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-ward-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-primary-600" />
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI disclaimer */}
      <div className="flex-shrink-0 mb-2">
        <p className="text-[10px] text-ward-muted text-center italic">
          AI-generated content is for clinical decision support only. Always verify with primary sources.
        </p>
      </div>

      {/* Input area */}
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
        <Button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          loading={loading}
          icon={<Send className="h-4 w-4" />}
          className="min-h-[44px] min-w-[44px]"
        >
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
    </div>
  )
}

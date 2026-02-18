import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Bot,
  Send,
  User,
  Sparkles,
  Stethoscope,
  Pill,
  Beaker,
  Loader2,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickPrompts = [
  { label: 'Differential diagnosis', icon: Stethoscope, prompt: 'What are the key differential diagnoses to consider?' },
  { label: 'Drug interactions', icon: Pill, prompt: 'Are there any significant drug interactions to be aware of?' },
  { label: 'Lab interpretation', icon: Beaker, prompt: 'Can you help interpret these lab results?' },
];

export default function AIAssistantPage() {
  const _user = useAuthStore((s) => s.user);
  const patients = usePatientStore((s) => s.patients);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  function handleInputChange(value: string) {
    setInput(value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }

  async function sendMessage(messageText?: string) {
    const text = (messageText || input).trim();
    if (!text || loading) return;

    setError(null);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const clinicalChat = httpsCallable(functions, 'clinicalChat');

      const result = await clinicalChat({
        message: text,
        patientId: selectedPatient?.id,
        conversationHistory: messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const data = result.data as { content?: string; response?: string; message?: string };
      const aiResponse = data.content || data.response || data.message || 'I was unable to generate a response. Please try again.';

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI chat error:', err);
      const errorMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content:
          'I apologize, but I am currently unable to process your request. This could be due to a network issue or service unavailability. Please try again in a moment.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError('Failed to get AI response. The service may be temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Clinical AI Assistant</h1>
                <p className="text-xs text-gray-500">
                  Powered by AI &mdash; For clinical decision support only
                </p>
              </div>
            </div>
          </div>

          {/* Patient context selector */}
          <div className="mt-3">
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className={clsx(
                'w-full h-9 px-3 pr-8 rounded-lg text-sm',
                'bg-gray-50 border border-gray-200',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
                'appearance-none bg-no-repeat bg-[length:14px_14px] bg-[right_0.5rem_center]',
                'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")]',
              )}
            >
              <option value="">No patient context (general query)</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} - {p.primaryDiagnosis}
                </option>
              ))}
            </select>
            {selectedPatient && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="info" size="sm">
                  {selectedPatient.primaryDiagnosis}
                </Badge>
                <Badge variant="default" size="sm">
                  Acuity {selectedPatient.acuity}
                </Badge>
                {selectedPatient.allergies.length > 0 && (
                  <Badge variant="critical" size="sm">
                    Allergies: {selectedPatient.allergies.join(', ')}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                How can I help you today?
              </h2>
              <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                Ask clinical questions, request differential diagnoses, or get help interpreting lab
                results. Select a patient for context-aware responses.
              </p>

              {/* Quick prompts */}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {quickPrompts.map((prompt) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={prompt.label}
                      type="button"
                      onClick={() => sendMessage(prompt.prompt)}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2.5 rounded-xl',
                        'bg-white border border-gray-200 text-sm text-gray-700',
                        'hover:bg-gray-50 hover:border-gray-300 transition-colors',
                      )}
                    >
                      <Icon size={16} className="text-blue-500" />
                      {prompt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    'flex gap-3',
                    msg.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Bot size={16} className="text-white" />
                    </div>
                  )}
                  <div
                    className={clsx(
                      'max-w-[80%] rounded-2xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800',
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={clsx(
                        'text-xs mt-1',
                        msg.role === 'user' ? 'text-blue-200' : 'text-gray-400',
                      )}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="shrink-0 w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                      <User size={16} className="text-gray-600" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-blue-500" />
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-2">
          <div className="p-2 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t border-gray-200 shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a clinical question..."
                rows={1}
                className={clsx(
                  'w-full resize-none rounded-xl text-sm text-gray-900',
                  'bg-gray-50 border border-gray-200 px-4 py-3',
                  'placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white',
                )}
                style={{ maxHeight: '120px' }}
              />
            </div>
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              loading={loading}
              iconLeft={!loading ? <Send size={16} /> : undefined}
              className="shrink-0"
            >
              Send
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            AI responses are for clinical decision support only. Always apply clinical judgment.
          </p>
        </div>
      </div>
    </div>
  );
}

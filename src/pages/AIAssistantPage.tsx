import React, { useState, useRef, useEffect } from 'react';
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
  Search,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

// ===========================================================================
// DRUG LOOKUP helpers
// ===========================================================================

const RECENT_SEARCHES_KEY = 'medward:recent-drug-searches';
const MAX_RECENT_SEARCHES = 10;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches().filter((s) => s.toLowerCase() !== query.toLowerCase());
    recent.unshift(query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES)));
  } catch { /* ignore */ }
}

function clearRecentSearches() {
  try { localStorage.removeItem(RECENT_SEARCHES_KEY); } catch { /* ignore */ }
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^---+$/.test(line.trim())) { elements.push(<hr key={key++} className="my-3 border-slate-200 dark:border-slate-700" />); continue; }
    if (line.startsWith('## ')) { elements.push(<h2 key={key++} className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-4 mb-1">{formatInline(line.slice(3))}</h2>); continue; }
    if (line.startsWith('### ')) { elements.push(<h3 key={key++} className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-3 mb-1">{formatInline(line.slice(4))}</h3>); continue; }
    if (line.startsWith('- ')) { elements.push(<div key={key++} className="flex gap-2 ml-1 mb-0.5"><span className="text-slate-400 shrink-0 mt-1.5 w-1 h-1 rounded-full bg-slate-400" /><span className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{formatInline(line.slice(2))}</span></div>); continue; }
    if (!line.trim()) { elements.push(<div key={key++} className="h-1" />); continue; }
    elements.push(<p key={key++} className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{formatInline(line)}</p>);
  }
  return elements;
}

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
      parts.push(<strong key={key++} className="font-semibold text-slate-900 dark:text-slate-100">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }
    parts.push(remaining);
    break;
  }
  return parts.length === 1 ? parts[0] : parts;
}

// ===========================================================================
// DRUG LOOKUP TAB
// ===========================================================================

function DrugLookupTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drugResponse, setDrugResponse] = useState<string | null>(null);
  const [searchedTerm, setSearchedTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());

  async function handleSearch(query?: string) {
    const searchTerm = (query || searchQuery).trim();
    if (!searchTerm) return;
    setLoading(true);
    setError(null);
    setDrugResponse(null);
    setSearchedTerm(searchTerm);
    try {
      const aiGateway = httpsCallable<
        { prompt: string; contextTag: string },
        { response: string; cacheHit: boolean }
      >(functions, 'aiGateway');
      const result = await aiGateway({ prompt: searchTerm, contextTag: 'drug_info' });
      setDrugResponse(result.data.response);
      saveRecentSearch(searchTerm);
      setRecentSearches(getRecentSearches());
    } catch (err) {
      console.error('Drug info error:', err);
      setError('Unable to retrieve drug information. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search bar */}
      <div className="bg-ward-card border-b border-ward-border shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search a drug (e.g. Metformin)..."
                className={clsx(
                  'w-full h-11 pl-10 pr-4 rounded-xl text-sm dark:text-slate-100',
                  'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700',
                  'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                )}
              />
            </div>
            <Button onClick={() => handleSearch()} loading={loading} disabled={!searchQuery.trim()}>
              Search
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <Card padding="md" className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </Card>
        )}

        {loading && (
          <Card padding="lg">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-blue-500 mb-3" />
              <p className="text-sm text-slate-500">Looking up {searchedTerm}...</p>
            </div>
          </Card>
        )}

        {drugResponse && !loading && (
          <div className="space-y-4">
            <Card padding="md">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                  <Pill size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{searchedTerm}</h2>
                  <p className="text-xs text-slate-400">AI-generated drug reference</p>
                </div>
              </div>
              <div>{renderMarkdown(drugResponse)}</div>
            </Card>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 text-center">
                AI-generated for clinical decision support only. Always verify with official drug references (BNF, Micromedex).
              </p>
            </div>
          </div>
        )}

        {!drugResponse && !loading && !error && (
          <div>
            {recentSearches.length > 0 ? (
              <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Searches</h3>
                  </div>
                  <button type="button" onClick={() => { clearRecentSearches(); setRecentSearches([]); }} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => { setSearchQuery(q); handleSearch(q); }}
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
                      )}
                    >
                      <Pill size={12} />
                      {q}
                      <ChevronRight size={12} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              </Card>
            ) : (
              <Card>
                <EmptyState
                  icon={<Pill size={24} />}
                  title="Search for drug information"
                  description="Enter a drug name above to get detailed information including dosing, side effects, interactions, and contraindications."
                />
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// AI CHAT TAB
// ===========================================================================

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

function AIChatTab() {
  const patients = usePatientStore((s) => s.patients);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const clinicalChat = httpsCallable(functions, 'clinicalChat');
      const result = await clinicalChat({
        message: text,
        patientId: selectedPatient?.id,
        conversationHistory: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      });
      const data = result.data as { content?: string; response?: string; message?: string };
      const aiResponse = data.content || data.response || data.message || 'I was unable to generate a response. Please try again.';
      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: aiResponse, timestamp: new Date() }]);
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages((prev) => [...prev, {
        id: `assistant-error-${Date.now()}`, role: 'assistant',
        content: 'I apologize, but I am currently unable to process your request. Please try again in a moment.',
        timestamp: new Date(),
      }]);
      setError('Failed to get AI response. The service may be temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <>
      {/* Patient context */}
      <div className="bg-ward-card border-b border-ward-border shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className={clsx(
              'w-full h-9 px-3 pr-8 rounded-lg text-sm',
              'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
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
              <Badge variant="info" size="sm">{selectedPatient.primaryDiagnosis}</Badge>
              <Badge variant="default" size="sm">Acuity {selectedPatient.acuity}</Badge>
              {selectedPatient.allergies.length > 0 && (
                <Badge variant="critical" size="sm">Allergies: {selectedPatient.allergies.join(', ')}</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">How can I help you today?</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Ask clinical questions, request differential diagnoses, or get help interpreting lab results.
              </p>
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
                        'bg-ward-card border border-ward-border text-sm text-slate-700 dark:text-slate-200',
                        'hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors',
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
                <div key={msg.id} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Bot size={16} className="text-white" />
                    </div>
                  )}
                  <div className={clsx(
                    'max-w-[80%] rounded-2xl px-4 py-3',
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-ward-card border border-ward-border text-slate-800 dark:text-slate-100',
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={clsx('text-xs mt-1', msg.role === 'user' ? 'text-blue-200' : 'text-slate-400')}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="shrink-0 w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                      <User size={16} className="text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="bg-ward-card border border-ward-border rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-blue-500" />
                      <span className="text-sm text-slate-500">Thinking...</span>
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
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="bg-ward-card border-t border-ward-border shrink-0">
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
                  'w-full resize-none rounded-xl text-sm text-slate-900 dark:text-slate-100',
                  'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3',
                  'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-700',
                )}
                style={{ maxHeight: '120px' }}
              />
            </div>
            <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} loading={loading} iconLeft={!loading ? <Send size={16} /> : undefined} className="shrink-0">
              Send
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            AI responses are for clinical decision support only. Always apply clinical judgment.
          </p>
        </div>
      </div>
    </>
  );
}

// ===========================================================================
// MAIN PAGE — Tab switcher
// ===========================================================================

type AITab = 'chat' | 'drugs';

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<AITab>('chat');

  return (
    <div className="min-h-screen bg-ward-bg flex flex-col">
      {/* Header + Tab selector */}
      <div className="bg-ward-card border-b border-ward-border shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">AI Tools</h1>
              <p className="text-xs text-slate-500">Clinical decision support</p>
            </div>
          </div>

          {/* Tab pills */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={clsx(
                'flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'chat'
                  ? 'bg-ward-card text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              )}
            >
              <Sparkles size={14} />
              AI Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('drugs')}
              className={clsx(
                'flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'drugs'
                  ? 'bg-ward-card text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              )}
            >
              <Pill size={14} />
              Drug Lookup
            </button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'chat' && <AIChatTab />}
      {activeTab === 'drugs' && <DrugLookupTab />}
    </div>
  );
}

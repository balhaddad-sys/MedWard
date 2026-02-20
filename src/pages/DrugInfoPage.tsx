import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Pill,
  Search,
  Loader2,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

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
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch {
    // Silently ignore storage errors
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Silently ignore storage errors
  }
}

/** Render a simple markdown subset (headers, bold, bullets, hr) */
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} className="my-3 border-slate-200" />);
      continue;
    }

    // H2 header
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-lg font-bold text-slate-900 mt-4 mb-1">
          {formatInline(line.slice(3))}
        </h2>
      );
      continue;
    }

    // H3 header
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-sm font-semibold text-slate-900 mt-3 mb-1">
          {formatInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Bullet item
    if (line.startsWith('- ')) {
      elements.push(
        <div key={key++} className="flex gap-2 ml-1 mb-0.5">
          <span className="text-slate-400 shrink-0 mt-1.5 w-1 h-1 rounded-full bg-slate-400" />
          <span className="text-sm text-slate-700 leading-relaxed">
            {formatInline(line.slice(2))}
          </span>
        </div>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-1" />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="text-sm text-slate-700 leading-relaxed">
        {formatInline(line)}
      </p>
    );
  }

  return elements;
}

/** Format inline markdown: **bold** and *italic* */
function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      parts.push(
        <strong key={key++} className="font-semibold text-slate-900">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }
    // No more matches
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : parts;
}

export default function DrugInfoPage() {
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

      const result = await aiGateway({
        prompt: searchTerm,
        contextTag: 'drug_info',
      });

      setDrugResponse(result.data.response);
      saveRecentSearch(searchTerm);
      setRecentSearches(getRecentSearches());
    } catch (err) {
      console.error('Drug info error:', err);
      setError(
        'Unable to retrieve drug information. The service may be temporarily unavailable. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleRecentClick(query: string) {
    setSearchQuery(query);
    handleSearch(query);
  }

  function handleClearRecent() {
    clearRecentSearches();
    setRecentSearches([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Pill size={24} className="text-slate-400" />
            <h1 className="text-2xl font-bold text-slate-900">Drug Information</h1>
          </div>

          {/* Search bar */}
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search a drug (e.g. Metformin)..."
                className={clsx(
                  'w-full h-11 pl-10 pr-4 rounded-xl text-sm',
                  'bg-slate-50 border border-slate-200',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white',
                  'placeholder:text-slate-400',
                )}
              />
            </div>
            <Button
              onClick={() => handleSearch()}
              loading={loading}
              disabled={!searchQuery.trim()}
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error */}
        {error && (
          <Card padding="md" className="border-red-200 bg-red-50/50">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card padding="lg">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-blue-500 mb-3" />
              <p className="text-sm text-slate-500">
                Looking up {searchedTerm}...
              </p>
            </div>
          </Card>
        )}

        {/* Drug info results */}
        {drugResponse && !loading && (
          <div className="space-y-4">
            <Card padding="md">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="p-2.5 bg-blue-100 rounded-xl">
                  <Pill size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{searchedTerm}</h2>
                  <p className="text-xs text-slate-400">AI-generated drug reference</p>
                </div>
              </div>
              <div>{renderMarkdown(drugResponse)}</div>
            </Card>

            {/* Disclaimer */}
            <div className="p-3 bg-slate-100 rounded-lg">
              <p className="text-xs text-slate-500 text-center">
                This information is AI-generated for clinical decision support only.
                Always verify with official drug references (BNF, Micromedex) and apply clinical judgment.
              </p>
            </div>
          </div>
        )}

        {/* Empty / initial state */}
        {!drugResponse && !loading && !error && (
          <div>
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-700">Recent Searches</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearRecent}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleRecentClick(q)}
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                        'bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors',
                      )}
                    >
                      <Pill size={12} />
                      {q}
                      <ChevronRight size={12} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {recentSearches.length === 0 && (
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

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Pill,
  Search,
  Loader2,
  AlertTriangle,
  Clock,
  X,
  ChevronRight,
  Info,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface DrugInfo {
  name: string;
  genericName?: string;
  indication: string;
  dosing: string;
  sideEffects: string;
  interactions: string;
  contraindications: string;
  pharmacology?: string;
  monitoring?: string;
}

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

export default function DrugInfoPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drugInfo, setDrugInfo] = useState<DrugInfo | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());

  async function handleSearch(query?: string) {
    const searchTerm = (query || searchQuery).trim();
    if (!searchTerm) return;

    setLoading(true);
    setError(null);
    setDrugInfo(null);

    try {
      const aiGateway = httpsCallable(functions, 'aiGateway');
      const result = await aiGateway({
        type: 'drugInfo',
        query: searchTerm,
      });

      const data = result.data as {
        drug?: DrugInfo;
        result?: DrugInfo;
        name?: string;
        indication?: string;
        dosing?: string;
        sideEffects?: string;
        interactions?: string;
        contraindications?: string;
      };

      const info: DrugInfo = data.drug || data.result || {
        name: data.name || searchTerm,
        indication: data.indication || 'Information not available',
        dosing: data.dosing || 'Information not available',
        sideEffects: data.sideEffects || 'Information not available',
        interactions: data.interactions || 'Information not available',
        contraindications: data.contraindications || 'Information not available',
      };

      setDrugInfo(info);
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

  const sections = drugInfo
    ? [
        { title: 'Indication', content: drugInfo.indication, icon: Info },
        { title: 'Dosing', content: drugInfo.dosing, icon: Pill },
        { title: 'Side Effects', content: drugInfo.sideEffects, icon: AlertTriangle },
        { title: 'Drug Interactions', content: drugInfo.interactions, icon: AlertTriangle },
        { title: 'Contraindications', content: drugInfo.contraindications, icon: AlertTriangle },
        ...(drugInfo.pharmacology
          ? [{ title: 'Pharmacology', content: drugInfo.pharmacology, icon: Info }]
          : []),
        ...(drugInfo.monitoring
          ? [{ title: 'Monitoring', content: drugInfo.monitoring, icon: Clock }]
          : []),
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Pill size={24} className="text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900">Drug Information</h1>
          </div>

          {/* Search bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search for a drug (e.g. Metformin, Warfarin, Amoxicillin)..."
                className={clsx(
                  'w-full h-11 pl-10 pr-4 rounded-xl text-sm',
                  'bg-gray-50 border border-gray-200',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white',
                  'placeholder:text-gray-400',
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
              <p className="text-sm text-gray-500">
                Looking up drug information...
              </p>
            </div>
          </Card>
        )}

        {/* Drug info results */}
        {drugInfo && !loading && (
          <div className="space-y-4">
            {/* Drug header */}
            <Card padding="md">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Pill size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{drugInfo.name}</h2>
                  {drugInfo.genericName && drugInfo.genericName !== drugInfo.name && (
                    <p className="text-sm text-gray-500">
                      Generic: {drugInfo.genericName}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Info sections */}
            {sections.map((section) => {
              const Icon = section.icon;
              const isWarning = section.title === 'Side Effects' ||
                section.title === 'Drug Interactions' ||
                section.title === 'Contraindications';

              return (
                <Card
                  key={section.title}
                  padding="md"
                  className={clsx(isWarning && 'border-amber-200')}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon
                      size={16}
                      className={clsx(isWarning ? 'text-amber-500' : 'text-blue-500')}
                    />
                    <h3 className="text-sm font-semibold text-gray-900">
                      {section.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {section.content}
                  </p>
                </Card>
              );
            })}

            {/* Disclaimer */}
            <div className="p-3 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-500 text-center">
                This information is AI-generated for clinical decision support only.
                Always verify with official drug references (BNF, Micromedex) and apply clinical judgment.
              </p>
            </div>
          </div>
        )}

        {/* Empty / initial state */}
        {!drugInfo && !loading && !error && (
          <div>
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <Card padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-700">Recent Searches</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearRecent}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((query) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => handleRecentClick(query)}
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
                        'bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors',
                      )}
                    >
                      <Pill size={12} />
                      {query}
                      <ChevronRight size={12} className="text-gray-400" />
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

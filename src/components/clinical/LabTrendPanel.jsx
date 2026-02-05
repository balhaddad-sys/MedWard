import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import aiService from '../../services/aiService';

/**
 * Panel order for consistent display
 */
const PANEL_ORDER = [
  'HEMATOLOGY', 'RENAL', 'ELECTROLYTES', 'METABOLIC',
  'LIVER', 'CARDIAC', 'COAGULATION', 'LIPID',
  'INFLAMMATORY', 'THYROID', 'MISCELLANEOUS'
];

/**
 * Parse markdown table from AI response into structured data
 */
function parseMarkdownTable(markdown) {
  if (!markdown) return [];

  const rows = markdown.split('\n').filter(line => line.includes('|'));
  const items = [];

  // Skip header rows (first 2 lines with |)
  const dataRows = rows.slice(2);

  for (const row of dataRows) {
    const cells = row.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < 5) continue;

    // Skip separator rows
    if (cells[0].includes('---')) continue;

    const [panel, test, current, previous, range, icon = ''] = cells;

    // Determine status from icon
    let status = 'stable';
    if (icon.includes('🔴')) status = 'critical';
    else if (icon.includes('🟢')) status = 'improving';

    items.push({
      panel: panel.toUpperCase().trim(),
      test: test.trim(),
      current: current.trim(),
      previous: previous.trim(),
      range: range.trim(),
      icon: icon.trim(),
      status
    });
  }

  return items;
}

/**
 * Group items by panel
 */
function groupByPanel(items) {
  const panels = {};

  for (const item of items) {
    if (!panels[item.panel]) {
      panels[item.panel] = [];
    }
    panels[item.panel].push(item);
  }

  return panels;
}

/**
 * Group items by status (triage view)
 */
function groupByStatus(items) {
  return {
    critical: items.filter(i => i.status === 'critical'),
    improving: items.filter(i => i.status === 'improving'),
    stable: items.filter(i => i.status === 'stable')
  };
}

/**
 * Get trend icon component
 */
function TrendIcon({ status }) {
  if (status === 'critical') {
    return <TrendingUp className="w-4 h-4 text-critical-red" />;
  }
  if (status === 'improving') {
    return <TrendingDown className="w-4 h-4 text-stable-green" />;
  }
  return <Minus className="w-4 h-4 text-neutral-400" />;
}

/**
 * Single lab row component
 */
function LabRow({ item }) {
  const statusClasses = {
    critical: 'bg-critical-red-bg border-l-4 border-l-critical-red',
    improving: 'bg-stable-green-bg border-l-4 border-l-stable-green',
    stable: 'border-l-4 border-l-neutral-200'
  };

  return (
    <div className={`flex items-center justify-between px-3 py-2.5 ${statusClasses[item.status]} hover:bg-neutral-50 transition-colors`}>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${item.status === 'critical' ? 'text-critical-red' : 'text-neutral-900'}`}>
          {item.test}
        </span>
      </div>

      <div className="flex items-center gap-3 font-mono text-sm">
        {item.previous && item.previous !== '—' && (
          <>
            <span className="text-neutral-400 line-through text-xs">{item.previous}</span>
            <span className="text-neutral-300">→</span>
          </>
        )}
        <span className={`font-semibold min-w-[50px] text-right ${item.status === 'critical' ? 'text-critical-red' : 'text-neutral-900'}`}>
          {item.current}
        </span>
      </div>

      <div className="hidden sm:block text-xs text-neutral-500 w-24 text-right ml-3">
        {item.range}
      </div>

      <div className="ml-3 w-6 flex justify-center">
        <TrendIcon status={item.status} />
      </div>
    </div>
  );
}

/**
 * Panel card component
 */
function PanelCard({ name, items }) {
  const criticalCount = items.filter(i => i.status === 'critical').length;

  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-neutral-100 px-4 py-2.5 border-b border-neutral-200 flex justify-between items-center">
        <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
          {name}
        </h3>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-xs bg-critical-red text-white px-2 py-0.5 rounded-full font-semibold">
              {criticalCount} critical
            </span>
          )}
          <span className="text-xs text-neutral-500">{items.length} tests</span>
        </div>
      </div>
      <div className="divide-y divide-neutral-100">
        {items.map((item, idx) => (
          <LabRow key={idx} item={item} />
        ))}
      </div>
    </Card>
  );
}

/**
 * Triage section component
 */
function TriageSection({ title, items, variant }) {
  if (items.length === 0) return null;

  const variants = {
    critical: {
      headerBg: 'bg-critical-red-bg',
      headerText: 'text-critical-red',
      headerBorder: 'border-critical-red',
      icon: <AlertTriangle className="w-4 h-4" />
    },
    improving: {
      headerBg: 'bg-stable-green-bg',
      headerText: 'text-stable-green',
      headerBorder: 'border-stable-green',
      icon: <TrendingDown className="w-4 h-4" />
    },
    stable: {
      headerBg: 'bg-neutral-100',
      headerText: 'text-neutral-600',
      headerBorder: 'border-neutral-300',
      icon: <Minus className="w-4 h-4" />
    }
  };

  const v = variants[variant];

  return (
    <div className="mb-4">
      <div className={`${v.headerBg} ${v.headerText} px-4 py-2 border-b-2 ${v.headerBorder} flex items-center gap-2`}>
        {v.icon}
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        <span className="text-xs opacity-75">({items.length})</span>
      </div>
      <Card className="rounded-t-none p-0">
        <div className="divide-y divide-neutral-100">
          {items.map((item, idx) => (
            <LabRow key={idx} item={item} />
          ))}
        </div>
      </Card>
    </div>
  );
}

/**
 * Main LabTrendPanel component
 */
export default function LabTrendPanel({ labs, patientContext }) {
  const [viewMode, setViewMode] = useState('panel'); // 'panel' or 'triage'
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Parse AI response into items
  const items = useMemo(() => {
    if (aiAnalysis) {
      return parseMarkdownTable(aiAnalysis);
    }
    return [];
  }, [aiAnalysis]);

  // Group items based on view mode
  const groupedData = useMemo(() => {
    if (viewMode === 'panel') {
      return groupByPanel(items);
    }
    return groupByStatus(items);
  }, [items, viewMode]);

  // Run AI analysis
  const runAnalysis = async () => {
    if (!labs || labs.length === 0) {
      setError('No lab data available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await aiService.analyzeTrendLabs(labs, patientContext);
      setAiAnalysis(response.response);
    } catch (err) {
      console.error('[LabTrendPanel] Analysis error:', err);
      setError(err.message || 'Failed to analyze labs');
    } finally {
      setLoading(false);
    }
  };

  // No labs case
  if (!labs || labs.length === 0) {
    return (
      <Card className="text-center py-8 text-neutral-500">
        No lab results to analyze
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-neutral-900">Lab Trend Analysis</h3>
        <div className="flex items-center gap-2">
          {aiAnalysis && (
            <div className="flex bg-neutral-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('panel')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                  viewMode === 'panel'
                    ? 'bg-white text-trust-blue shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                By System
              </button>
              <button
                onClick={() => setViewMode('triage')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                  viewMode === 'triage'
                    ? 'bg-white text-trust-blue shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                By Urgency
              </button>
            </div>
          )}
          <Button
            onClick={runAnalysis}
            loading={loading}
            size="sm"
            disabled={loading}
          >
            {aiAnalysis ? 'Refresh' : 'Analyze Trends'}
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Card className="bg-critical-red-bg border-critical-red text-critical-red text-sm py-3">
          {error}
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-neutral-500">Analyzing lab trends...</span>
        </div>
      )}

      {/* Results */}
      {!loading && aiAnalysis && items.length > 0 && (
        <>
          {viewMode === 'panel' ? (
            // Panel view - grouped by physiological system
            <div className="space-y-4">
              {PANEL_ORDER.filter(p => groupedData[p]).map(panelName => (
                <PanelCard
                  key={panelName}
                  name={panelName}
                  items={groupedData[panelName]}
                />
              ))}
              {/* Any panels not in PANEL_ORDER */}
              {Object.keys(groupedData)
                .filter(p => !PANEL_ORDER.includes(p))
                .map(panelName => (
                  <PanelCard
                    key={panelName}
                    name={panelName}
                    items={groupedData[panelName]}
                  />
                ))}
            </div>
          ) : (
            // Triage view - grouped by urgency
            <div>
              <TriageSection
                title="Attention Required"
                items={groupedData.critical}
                variant="critical"
              />
              <TriageSection
                title="Improving"
                items={groupedData.improving}
                variant="improving"
              />
              <TriageSection
                title="Stable / Unchanged"
                items={groupedData.stable}
                variant="stable"
              />
            </div>
          )}
        </>
      )}

      {/* Empty result */}
      {!loading && aiAnalysis && items.length === 0 && (
        <Card className="text-center py-8 text-neutral-500">
          Could not parse lab trends. Try again.
        </Card>
      )}

      {/* Initial state - show summary */}
      {!loading && !aiAnalysis && (
        <Card className="text-center py-6">
          <p className="text-neutral-600 text-sm mb-3">
            {labs.length} lab result{labs.length !== 1 ? 's' : ''} available
          </p>
          <p className="text-xs text-neutral-400">
            Click "Analyze Trends" to see organized results with clinical context
          </p>
        </Card>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import aiService from '../../services/aiService';

/**
 * Clinical panel configuration - order and display names
 */
const PANEL_CONFIG = {
  HEMATOLOGY: { name: 'Hematology', color: '#dc2626', bgColor: '#fef2f2' },
  RENAL: { name: 'Renal Function', color: '#ea580c', bgColor: '#fff7ed' },
  ELECTROLYTES: { name: 'Electrolytes', color: '#ca8a04', bgColor: '#fefce8' },
  METABOLIC: { name: 'Metabolic', color: '#16a34a', bgColor: '#f0fdf4' },
  LIVER: { name: 'Liver Function', color: '#0891b2', bgColor: '#ecfeff' },
  CARDIAC: { name: 'Cardiac Markers', color: '#7c3aed', bgColor: '#f5f3ff' },
  COAGULATION: { name: 'Coagulation', color: '#be185d', bgColor: '#fdf2f8' },
  LIPID: { name: 'Lipid Panel', color: '#0d9488', bgColor: '#f0fdfa' },
  INFLAMMATORY: { name: 'Inflammatory', color: '#b91c1c', bgColor: '#fef2f2' },
  THYROID: { name: 'Thyroid', color: '#4f46e5', bgColor: '#eef2ff' },
  MISCELLANEOUS: { name: 'Other Tests', color: '#6b7280', bgColor: '#f9fafb' }
};

const PANEL_ORDER = Object.keys(PANEL_CONFIG);

/**
 * Parse markdown table from AI response
 */
function parseMarkdownTable(markdown) {
  if (!markdown) return [];

  const items = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    if (!line.includes('|')) continue;

    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < 5) continue;
    if (cells[0].includes('---') || cells[0].toLowerCase() === 'panel') continue;

    const [panel, test, current, previous, range, icon = ''] = cells;

    let status = 'stable';
    if (icon.includes('🔴')) status = 'critical';
    else if (icon.includes('🟢')) status = 'improving';

    items.push({
      panel: panel.toUpperCase().trim(),
      test: test.trim(),
      current: current.trim(),
      previous: previous.trim(),
      range: range.trim(),
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
    if (!panels[item.panel]) panels[item.panel] = [];
    panels[item.panel].push(item);
  }
  return panels;
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }) {
  if (status === 'critical') {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingUp className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">CRITICAL</span>
      </div>
    );
  }
  if (status === 'improving') {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <TrendingDown className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">IMPROVING</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-neutral-400">
      <Minus className="w-3.5 h-3.5" />
      <span className="text-xs">Stable</span>
    </div>
  );
}

/**
 * Single lab result row
 */
function LabResultRow({ item, isLast }) {
  const rowBg = item.status === 'critical'
    ? 'bg-red-50'
    : item.status === 'improving'
      ? 'bg-green-50'
      : 'bg-white';

  const valueBorder = item.status === 'critical'
    ? 'border-l-2 border-l-red-500'
    : item.status === 'improving'
      ? 'border-l-2 border-l-green-500'
      : '';

  return (
    <div className={`${rowBg} ${valueBorder} ${!isLast ? 'border-b border-neutral-100' : ''}`}>
      <div className="flex items-center px-4 py-3">
        {/* Test Name */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${item.status === 'critical' ? 'font-semibold text-red-900' : 'text-neutral-800'}`}>
            {item.test}
          </span>
        </div>

        {/* Values */}
        <div className="flex items-center gap-4 text-sm font-mono">
          {item.previous && item.previous !== '—' && (
            <span className="text-neutral-400 text-xs w-16 text-right">{item.previous}</span>
          )}
          <span className="text-neutral-300">→</span>
          <span className={`font-bold w-16 text-right ${item.status === 'critical' ? 'text-red-600' : 'text-neutral-900'}`}>
            {item.current}
          </span>
        </div>

        {/* Reference Range */}
        <div className="w-24 text-right hidden sm:block">
          <span className="text-xs text-neutral-400">{item.range}</span>
        </div>

        {/* Status */}
        <div className="w-24 flex justify-end">
          <StatusIndicator status={item.status} />
        </div>
      </div>
    </div>
  );
}

/**
 * Clinical panel card
 */
function ClinicalPanel({ panelKey, items }) {
  const config = PANEL_CONFIG[panelKey] || PANEL_CONFIG.MISCELLANEOUS;
  const criticalCount = items.filter(i => i.status === 'critical').length;
  const improvingCount = items.filter(i => i.status === 'improving').length;

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
      {/* Panel Header */}
      <div
        className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between"
        style={{ backgroundColor: config.bgColor }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1 h-6 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <h4 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">
            {config.name}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
              {criticalCount} Critical
            </span>
          )}
          {improvingCount > 0 && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
              {improvingCount} Improving
            </span>
          )}
          <span className="text-xs text-neutral-500">{items.length} tests</span>
        </div>
      </div>

      {/* Panel Rows */}
      <div>
        {items.map((item, idx) => (
          <LabResultRow
            key={idx}
            item={item}
            isLast={idx === items.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Summary stats bar
 */
function SummaryBar({ items }) {
  const critical = items.filter(i => i.status === 'critical').length;
  const improving = items.filter(i => i.status === 'improving').length;
  const stable = items.filter(i => i.status === 'stable').length;

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className={`p-3 rounded-lg ${critical > 0 ? 'bg-red-50' : 'bg-neutral-50'}`}>
          <div className={`text-2xl font-bold ${critical > 0 ? 'text-red-600' : 'text-neutral-400'}`}>
            {critical}
          </div>
          <div className="text-xs text-neutral-600 font-medium mt-1 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Attention Required
          </div>
        </div>
        <div className={`p-3 rounded-lg ${improving > 0 ? 'bg-green-50' : 'bg-neutral-50'}`}>
          <div className={`text-2xl font-bold ${improving > 0 ? 'text-green-600' : 'text-neutral-400'}`}>
            {improving}
          </div>
          <div className="text-xs text-neutral-600 font-medium mt-1 flex items-center justify-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Improving
          </div>
        </div>
        <div className="p-3 rounded-lg bg-neutral-50">
          <div className="text-2xl font-bold text-neutral-600">{stable}</div>
          <div className="text-xs text-neutral-600 font-medium mt-1 flex items-center justify-center gap-1">
            <Minus className="w-3 h-3" />
            Stable
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main LabTrendPanel component
 */
export default function LabTrendPanel({ labs, patientContext }) {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Parse AI response
  const items = useMemo(() => {
    if (aiAnalysis) return parseMarkdownTable(aiAnalysis);
    return [];
  }, [aiAnalysis]);

  // Group by panel
  const groupedData = useMemo(() => groupByPanel(items), [items]);

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

  // No labs
  if (!labs || labs.length === 0) {
    return (
      <Card className="text-center py-8 text-neutral-500">
        No lab results to analyze
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-trust-blue to-blue-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold">Lab Trend Analysis</h3>
              <p className="text-sm text-white/80">{labs.length} results available</p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="px-4 py-2 bg-white text-trust-blue font-semibold rounded-lg shadow-md hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {loading ? (
              'Analyzing...'
            ) : aiAnalysis ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </>
            ) : (
              'Analyze Trends'
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-lg border border-neutral-200 p-8 flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-4 text-neutral-600">Analyzing lab trends with AI...</p>
          <p className="text-xs text-neutral-400 mt-1">Organizing by clinical panels</p>
        </div>
      )}

      {/* Results */}
      {!loading && aiAnalysis && items.length > 0 && (
        <>
          {/* Summary Stats */}
          <SummaryBar items={items} />

          {/* Clinical Panels */}
          <div className="space-y-4">
            {PANEL_ORDER.filter(p => groupedData[p]).map(panelKey => (
              <ClinicalPanel
                key={panelKey}
                panelKey={panelKey}
                items={groupedData[panelKey]}
              />
            ))}
            {/* Panels not in order */}
            {Object.keys(groupedData)
              .filter(p => !PANEL_ORDER.includes(p))
              .map(panelKey => (
                <ClinicalPanel
                  key={panelKey}
                  panelKey={panelKey}
                  items={groupedData[panelKey]}
                />
              ))}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-neutral-400 pt-2">
            AI-assisted analysis for educational purposes only
          </p>
        </>
      )}

      {/* Empty parse result */}
      {!loading && aiAnalysis && items.length === 0 && (
        <Card className="text-center py-8 text-neutral-500">
          Could not parse lab trends. Please try again.
        </Card>
      )}

      {/* Initial state */}
      {!loading && !aiAnalysis && (
        <div className="bg-neutral-50 rounded-lg border border-dashed border-neutral-300 p-8 text-center">
          <Activity className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">Ready to Analyze</p>
          <p className="text-sm text-neutral-400 mt-1">
            Click "Analyze Trends" to organize {labs.length} lab results by clinical panels
          </p>
        </div>
      )}
    </div>
  );
}

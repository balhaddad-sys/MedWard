import { useState, useMemo, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Badge from '../ui/Badge';
import aiService from '../../services/aiService';

// Preferred panel ordering for clinical display
const PANEL_ORDER = [
  'HEMATOLOGY', 'RENAL/KIDNEY', 'ELECTROLYTES', 'METABOLIC',
  'LIVER', 'CARDIAC/MYOCARDIAL', 'COAGULATION', 'LIPID',
  'PROTEIN', 'THYROID', 'INFLAMMATORY', 'MISCELLANEOUS',
];

/**
 * Parse the AI markdown table response into structured panel data.
 * Expected format: | Panel | Test | Current | Previous | Range | Icon |
 */
function parseMarkdownTable(markdown) {
  if (!markdown || markdown.trim().length === 0) return {};

  // Extract code block content if wrapped in ```
  let tableContent = markdown;
  const codeBlockMatch = markdown.match(/```\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    tableContent = codeBlockMatch[1];
  }

  const rows = tableContent.match(/\|.*\|/g) || [];
  if (rows.length < 3) return {};

  const panels = {};

  // Skip header row and separator row (first 2 rows)
  rows.slice(2).forEach((row) => {
    const cols = row
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c !== '');

    if (cols.length < 6) return;

    const [panel, testName, current, previous, range, icon] = cols;
    const panelKey = panel.toUpperCase().trim();

    if (!panels[panelKey]) {
      panels[panelKey] = [];
    }

    let status = 'stable';
    if (icon.includes('\u{1F534}')) status = 'critical';
    else if (icon.includes('\u{1F7E2}')) status = 'improving';

    panels[panelKey].push({
      test: testName.trim(),
      current: current.trim(),
      previous: previous.trim(),
      range: range.trim(),
      icon: icon.trim(),
      status,
    });
  });

  return panels;
}

/**
 * Sort parsed panels into the preferred clinical display order.
 */
function getOrderedPanelKeys(panels) {
  const ordered = PANEL_ORDER.filter((p) => panels[p] && panels[p].length > 0);
  const extra = Object.keys(panels).filter(
    (p) => !PANEL_ORDER.includes(p) && panels[p].length > 0
  );
  return [...ordered, ...extra];
}

// --- Panel View (grouped by physiological system) ---

function PanelView({ panels }) {
  const panelKeys = useMemo(() => getOrderedPanelKeys(panels), [panels]);

  if (panelKeys.length === 0) {
    return (
      <Card className="text-center py-6 text-neutral-400 text-sm">
        No trend data to display.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {panelKeys.map((panelKey) => (
        <div key={panelKey} className="lab-panel-card">
          <div className="lab-panel-card-header">
            <span className="text-xs font-extrabold text-neutral-600 uppercase tracking-wider">
              {panelKey}
            </span>
            <Badge variant="neutral">{panels[panelKey].length} tests</Badge>
          </div>
          <div>
            {panels[panelKey].map((item, idx) => (
              <div
                key={`${panelKey}-${idx}`}
                className={`lab-trend-row lab-trend-row--${item.status}`}
              >
                <div className="lab-trend-row__name">{item.test}</div>
                <div className="lab-trend-row__values">
                  {item.previous !== '—' && (
                    <>
                      <span className="text-neutral-400 text-xs line-through">
                        {item.previous}
                      </span>
                      <span className="text-neutral-300 text-xs font-bold">&rarr;</span>
                    </>
                  )}
                  <span
                    className={`font-bold text-sm ${
                      item.status === 'critical'
                        ? 'text-critical-red'
                        : item.status === 'improving'
                        ? 'text-stable-green'
                        : 'text-neutral-900'
                    }`}
                  >
                    {item.current}
                  </span>
                </div>
                <div className="lab-trend-row__range">{item.range}</div>
                <div className="lab-trend-row__icon">{item.icon}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Triage View (sorted by clinical urgency) ---

function TriageView({ panels }) {
  const { critical, improving, stable } = useMemo(() => {
    const buckets = { critical: [], improving: [], stable: [] };
    Object.values(panels)
      .flat()
      .forEach((item) => {
        buckets[item.status]?.push(item);
      });
    return buckets;
  }, [panels]);

  const hasData = critical.length > 0 || improving.length > 0 || stable.length > 0;

  if (!hasData) {
    return (
      <Card className="text-center py-6 text-neutral-400 text-sm">
        No trend data to display.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {critical.length > 0 && (
        <TriageSection
          label="Attention Required"
          icon="⚠️"
          count={critical.length}
          items={critical}
          variant="critical"
        />
      )}
      {improving.length > 0 && (
        <TriageSection
          label="Improving"
          icon="✅"
          count={improving.length}
          items={improving}
          variant="improving"
        />
      )}
      {stable.length > 0 && (
        <TriageSection
          label="Stable / Unchanged"
          icon="⏺"
          count={stable.length}
          items={stable}
          variant="stable"
        />
      )}
    </div>
  );
}

const TRIAGE_LABELS = {
  critical: 'WORSENING',
  improving: 'IMPROVING',
  stable: 'STABLE',
};

function TriageSection({ label, icon, count, items, variant }) {
  const headerColor =
    variant === 'critical'
      ? 'text-critical-red border-critical-red'
      : variant === 'improving'
      ? 'text-stable-green border-stable-green'
      : 'text-neutral-500 border-neutral-300';

  const badgeVariant =
    variant === 'critical' ? 'critical' : variant === 'improving' ? 'stable' : 'neutral';

  return (
    <div>
      <div className={`text-xs font-extrabold uppercase tracking-wider pb-2 mb-2 border-b-2 ${headerColor}`}>
        {icon} {label} ({count})
      </div>
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`lab-trend-row lab-trend-row--${item.status}`}
        >
          <div className="lab-trend-row__name">{item.test}</div>
          <div className="lab-trend-row__values">
            {item.previous !== '—' && (
              <>
                <span className="text-neutral-400 text-xs line-through">
                  {item.previous}
                </span>
                <span className="text-neutral-300 text-xs font-bold">&rarr;</span>
              </>
            )}
            <span
              className={`font-bold text-sm ${
                item.status === 'critical'
                  ? 'text-critical-red'
                  : item.status === 'improving'
                  ? 'text-stable-green'
                  : 'text-neutral-900'
              }`}
            >
              {item.current}
            </span>
          </div>
          <Badge variant={badgeVariant} className="text-[0.65rem]">
            {TRIAGE_LABELS[item.status]}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// --- Main Component ---

export default function LabTrendAnalysis({ labs, patient, patientId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawMarkdown, setRawMarkdown] = useState(null);
  const [layout, setLayout] = useState('panel'); // 'panel' | 'triage'

  const panels = useMemo(() => {
    if (!rawMarkdown) return {};
    return parseMarkdownTable(rawMarkdown);
  }, [rawMarkdown]);

  const hasPanelData = useMemo(
    () => Object.keys(panels).length > 0,
    [panels]
  );

  // Prepare lab data for the Cloud Function
  const prepareLabData = useCallback(() => {
    if (!labs || labs.length === 0) return [];

    // Group by test name and get the latest + previous
    const grouped = {};
    labs.forEach((lab) => {
      if (!grouped[lab.testName]) grouped[lab.testName] = [];
      grouped[lab.testName].push(lab);
    });

    return Object.entries(grouped).map(([testName, testLabs]) => {
      const latest = testLabs[0]; // Already sorted desc by date
      return {
        testName,
        current: latest.value,
        previous: latest.previousValue ?? (testLabs[1]?.value ?? null),
        unit: latest.unit || '',
        date: latest.date,
        isAbnormal: latest.isAbnormal,
        isCritical: latest.isCritical,
      };
    });
  }, [labs]);

  const handleAnalyze = async () => {
    const labData = prepareLabData();
    if (labData.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const patientContext = patient
        ? {
            id: patientId,
            name: patient.name,
            ageSex: patient.ageSex,
            diagnosis: patient.diagnosis,
          }
        : null;

      const result = await aiService.analyzeTrends(labData, patientContext);
      setRawMarkdown(result.response);
    } catch (err) {
      setError(err.message || 'Failed to analyze lab trends');
    } finally {
      setLoading(false);
    }
  };

  const toggleLayout = () => {
    setLayout((prev) => (prev === 'panel' ? 'triage' : 'panel'));
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">
          Trend Analysis
        </h3>
        <div className="flex items-center gap-2">
          {hasPanelData && (
            <Button variant="ghost" onClick={toggleLayout} className="text-xs px-2 py-1">
              {layout === 'panel' ? '⚠️ View by Urgency' : '📋 View by System'}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={handleAnalyze}
            loading={loading}
            disabled={!labs || labs.length === 0}
            className="text-xs"
          >
            {rawMarkdown ? 'Re-analyze' : 'Analyze Trends'}
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="text-sm text-critical-red bg-critical-red-bg border-critical-red-border">
          {error}
        </Card>
      )}

      {/* Loading state */}
      {loading && <Spinner size="md" />}

      {/* Results */}
      {!loading && hasPanelData && (
        <>
          {layout === 'panel' ? (
            <PanelView panels={panels} />
          ) : (
            <TriageView panels={panels} />
          )}
          <p className="text-xs text-neutral-400 text-center pt-2">
            Educational reference only. Always verify with local guidelines and senior clinical judgment.
          </p>
        </>
      )}

      {/* Empty state — no analysis run yet */}
      {!loading && !hasPanelData && !error && labs && labs.length > 0 && (
        <Card className="text-center py-6 text-neutral-400 text-sm">
          Click &ldquo;Analyze Trends&rdquo; to generate a clinical trend report from {labs.length} lab results.
        </Card>
      )}

      {/* No labs at all */}
      {!loading && (!labs || labs.length === 0) && (
        <Card className="text-center py-6 text-neutral-400 text-sm">
          No lab results available for trend analysis.
        </Card>
      )}
    </div>
  );
}

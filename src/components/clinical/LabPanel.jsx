import { useState, useEffect } from 'react';
import labService from '../../services/labService';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LabForm from './LabForm';
import LabTrendPanel from './LabTrendPanel';
import Sparkline from '../ui/Sparkline';
import { getDeltaSeverity, getTrendColor } from '../../utils/deltaEngine';
import { formatDateTime } from '../../utils/formatters';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function LabPanel({ patientId, patientContext = null }) {
  const [labs, setLabs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showAllLabs, setShowAllLabs] = useState(false);

  useEffect(() => {
    const unsub = labService.subscribe(patientId, setLabs);
    return () => unsub();
  }, [patientId]);

  // Group labs by test name for sparkline
  const grouped = {};
  labs.forEach((lab) => {
    if (!grouped[lab.testName]) grouped[lab.testName] = [];
    grouped[lab.testName].push(lab);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">
          Lab Results ({labs.length})
        </h3>
        <Button variant="secondary" onClick={() => setShowForm(true)} className="text-xs">
          + Add Lab
        </Button>
      </div>

      {/* AI-Powered Trend Analysis Panel */}
      {labs.length > 0 && (
        <LabTrendPanel labs={labs} patientContext={patientContext} />
      )}

      {/* Toggle for individual lab list */}
      {labs.length > 0 && (
        <button
          onClick={() => setShowAllLabs(!showAllLabs)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          {showAllLabs ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide Individual Labs
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show Individual Labs ({Object.keys(grouped).length} tests)
            </>
          )}
        </button>
      )}

      {/* Grouped by test name - collapsible */}
      {showAllLabs && Object.entries(grouped).map(([testName, testLabs]) => {
        const latest = testLabs[0];
        const values = [...testLabs].reverse().map((l) => l.value);
        const severity = getDeltaSeverity(testName, latest.value, latest.previousValue);

        return (
          <Card key={testName} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900 text-sm">{testName}</span>
                {latest.isCritical && <Badge variant="critical">CRITICAL</Badge>}
                {!latest.isCritical && latest.isAbnormal && <Badge variant="watch">Abnormal</Badge>}
                {latest.trend && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: getTrendColor(severity) }}
                  >
                    {latest.trend === 'Rising' ? '↑' : latest.trend === 'Falling' ? '↓' : '→'} {latest.trend}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold text-neutral-900">{latest.value}</span>
                <span className="text-xs text-neutral-500">{latest.unit}</span>
                {latest.delta !== null && latest.delta !== undefined && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: getTrendColor(severity) }}
                  >
                    ({latest.delta > 0 ? '+' : ''}{latest.delta.toFixed(1)})
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {formatDateTime(latest.date)}
              </p>
            </div>
            <div className="ml-4">
              <Sparkline values={values} color={getTrendColor(severity)} />
            </div>
          </Card>
        );
      })}

      {labs.length === 0 && (
        <Card className="text-center py-6 text-neutral-400 text-sm">
          No lab results yet. Add the first lab result.
        </Card>
      )}

      {showForm && (
        <LabForm
          patientId={patientId}
          patientContext={patientContext}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

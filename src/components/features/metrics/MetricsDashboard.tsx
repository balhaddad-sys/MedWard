/**
 * Metrics Dashboard (Phase 9)
 *
 * Displays all 4 adoption metrics with trends
 * Shows 30-day performance overview
 */

import { useState, useEffect } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { MetricsTracker } from '@/services/MetricsTracker';
import { MetricCard } from './MetricCard';
import { METRIC_TARGETS } from '@/types/metrics';
import type { MetricSummary, MetricType } from '@/types/metrics';

export function MetricsDashboard() {
  const [summaries, setSummaries] = useState<Record<MetricType, MetricSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d'>('30d');

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await MetricsTracker.getAllSummaries(period);
      setSummaries(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading metrics...</p>
      </div>
    );
  }

  if (!summaries) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load metrics. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Performance Metrics</h2>
            <p className="text-sm text-gray-600">
              Track adoption and validate improvements
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              period === '7d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              period === '30d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={loadMetrics}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {METRIC_TARGETS.map((target) => {
          const summary = summaries[target.metricType];
          return <MetricCard key={target.metricType} summary={summary} target={target} />;
        })}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>How to interpret:</strong> For time metrics (time-to-document, task-completion,
          alert-response), lower values are better. For handover-completeness, higher values are
          better. Trend arrows show whether performance is improving (trending toward target) over
          the selected period.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">On Track</h4>
          <p className="text-sm text-green-700">
            {
              Object.values(summaries).filter((s, i) => {
                const target = METRIC_TARGETS[i];
                return target.metricType === 'handover-completeness'
                  ? s.mean >= target.target
                  : s.mean <= target.target;
              }).length
            }{' '}
            / {METRIC_TARGETS.length} metrics meeting targets
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="font-semibold text-orange-900 mb-2">Needs Attention</h4>
          <p className="text-sm text-orange-700">
            {
              Object.values(summaries).filter((s, i) => {
                const target = METRIC_TARGETS[i];
                return target.metricType === 'handover-completeness'
                  ? s.mean < target.target
                  : s.mean > target.target;
              }).length
            }{' '}
            metrics below target
          </p>
        </div>
      </div>
    </div>
  );
}

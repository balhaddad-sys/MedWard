/**
 * Metric Card (Phase 9)
 *
 * Individual metric display with trend indicator
 */

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { MetricSummary, MetricTarget } from '@/types/metrics';

interface MetricCardProps {
  summary: MetricSummary;
  target: MetricTarget;
}

export function MetricCard({ summary, target }: MetricCardProps) {
  const isOnTarget =
    target.metricType === 'handover-completeness'
      ? summary.mean >= target.target
      : summary.mean <= target.target;

  const trendConfig = {
    improving: {
      icon: TrendingDown,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      label: 'Improving',
    },
    declining: {
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      label: 'Declining',
    },
    stable: {
      icon: Minus,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      label: 'Stable',
    },
  };

  const config = trendConfig[summary.trend];
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 mb-1">{target.description}</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">
              {summary.mean}
              <span className="text-lg text-gray-600 ml-1">{target.unit}</span>
            </p>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className={`p-2 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-600">Median</p>
          <p className="text-sm font-semibold text-gray-900">
            {summary.median}
            {target.unit === '%' && '%'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">P95</p>
          <p className="text-sm font-semibold text-gray-900">
            {summary.p95}
            {target.unit === '%' && '%'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Count</p>
          <p className="text-sm font-semibold text-gray-900">{summary.count}</p>
        </div>
      </div>

      {/* Target Comparison */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${config.bgColor} ${config.color}`}
          >
            {config.label}
          </span>
          <span className="text-xs text-gray-600">
            ({summary.period === '7d' ? '7 days' : '30 days'})
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600">
            Target: {target.target}
            {target.unit}
          </p>
          <p
            className={`text-xs font-semibold ${
              isOnTarget ? 'text-green-600' : 'text-orange-600'
            }`}
          >
            {isOnTarget ? '✓ On Track' : '⚠ Below Target'}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Action Section (Phase 2)
 *
 * Reusable section wrapper for Shift View action items
 * Shows title, count, and severity indicator
 */

import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface ActionSectionProps {
  title: string;
  count: number;
  severity: 'critical' | 'high' | 'medium';
  children: React.ReactNode;
}

export function ActionSection({ title, count, severity, children }: ActionSectionProps) {
  const severityConfig = {
    critical: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-900',
      badgeColor: 'bg-red-100 text-red-700',
      icon: AlertTriangle,
    },
    high: {
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-900',
      badgeColor: 'bg-orange-100 text-orange-700',
      icon: AlertCircle,
    },
    medium: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-900',
      badgeColor: 'bg-yellow-100 text-yellow-700',
      icon: AlertCircle,
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-6`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.badgeColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${config.textColor}`}>{title}</h2>
            <p className="text-sm text-gray-600">
              {count} {count === 1 ? 'item' : 'items'} requiring attention
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${config.badgeColor}`}>
          {count}
        </div>
      </div>

      {/* Section Content */}
      <div className="mt-4">{children}</div>
    </div>
  );
}

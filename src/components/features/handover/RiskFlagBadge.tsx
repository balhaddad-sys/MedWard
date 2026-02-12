/**
 * Risk Flag Badge (Phase 5)
 *
 * Colored badge component for SBAR risk flags
 * Displays critical safety information prominently
 */

import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { RiskFlag } from '@/services/SBARGenerator';

interface RiskFlagBadgeProps {
  flag: RiskFlag;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskFlagBadge({ flag, size = 'md' }: RiskFlagBadgeProps) {
  const severityConfig = {
    critical: {
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      textColor: 'text-red-900',
      icon: AlertTriangle,
    },
    high: {
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-300',
      textColor: 'text-orange-900',
      icon: AlertCircle,
    },
    medium: {
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-300',
      textColor: 'text-yellow-900',
      icon: Info,
    },
  };

  const sizeConfig = {
    sm: {
      padding: 'px-2 py-1',
      textSize: 'text-xs',
      iconSize: 'w-3 h-3',
    },
    md: {
      padding: 'px-3 py-2',
      textSize: 'text-sm',
      iconSize: 'w-4 h-4',
    },
    lg: {
      padding: 'px-4 py-3',
      textSize: 'text-base',
      iconSize: 'w-5 h-5',
    },
  };

  const config = severityConfig[flag.severity];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 ${sizeStyles.padding} ${config.bgColor} ${config.borderColor} ${config.textColor} border-2 rounded-lg font-semibold ${sizeStyles.textSize}`}
    >
      <Icon className={sizeStyles.iconSize} />
      <div>
        <span className="font-bold">{flag.label}:</span>{' '}
        <span>{flag.details}</span>
      </div>
    </div>
  );
}

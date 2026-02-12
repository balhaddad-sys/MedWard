/**
 * Alert Banner (Phase 6)
 *
 * Persistent banner for critical alerts
 * Stays visible until dismissed
 */

import { useState } from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Alert } from '@/types/alert';

interface AlertBannerProps {
  alert: Alert;
  onDismiss: (alertId: string) => void;
}

export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss(alert.id);
  };

  const handleAction = () => {
    if (alert.actionUrl) {
      navigate(alert.actionUrl);
      handleDismiss();
    }
  };

  const tierStyles = {
    critical: {
      bgColor: 'bg-red-600',
      textColor: 'text-white',
      hoverBg: 'hover:bg-red-700',
    },
    high: {
      bgColor: 'bg-orange-500',
      textColor: 'text-white',
      hoverBg: 'hover:bg-orange-600',
    },
    info: {
      bgColor: 'bg-blue-500',
      textColor: 'text-white',
      hoverBg: 'hover:bg-blue-600',
    },
  };

  const styles = tierStyles[alert.tier];

  return (
    <div
      className={`${styles.bgColor} ${styles.textColor} shadow-lg border-b-4 border-black border-opacity-20 animate-slide-down`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Alert Content */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm uppercase tracking-wide">
                  {alert.tier === 'critical' ? '🚨 CRITICAL' : alert.tier.toUpperCase()}
                </span>
                {alert.patientName && alert.bedNumber && (
                  <span className="text-sm opacity-90">
                    {alert.patientName} ({alert.bedNumber})
                  </span>
                )}
              </div>
              <p className="font-semibold text-base mt-1">{alert.title}</p>
              <p className="text-sm opacity-90 mt-1">{alert.message}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {alert.actionUrl && (
              <button
                onClick={handleAction}
                className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
              >
                <span>View</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              title="Dismiss alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

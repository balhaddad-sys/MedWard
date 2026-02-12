/**
 * Quiet Hours Toggle (Phase 6)
 *
 * Settings component for configuring quiet hours
 * Allows users to enable/disable quiet hours and set time range
 */

import { useState, useEffect } from 'react';
import { Moon, Bell, BellOff } from 'lucide-react';
import { AlertTierSystem } from '@/services/AlertTierSystem';
import type { AlertConfig } from '@/types/alert';
import { DEFAULT_ALERT_CONFIG } from '@/types/alert';

export function QuietHoursToggle() {
  const [config, setConfig] = useState<AlertConfig>(DEFAULT_ALERT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleQuietHours = () => {
    const newConfig = { ...config, quietHoursEnabled: !config.quietHoursEnabled };
    setConfig(newConfig);
    AlertTierSystem.setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleTimeChange = (field: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    AlertTierSystem.setConfig(newConfig);
    saveConfig(newConfig);
  };

  const saveConfig = async (newConfig: AlertConfig) => {
    setIsSaving(true);
    try {
      // Save to localStorage for persistence
      localStorage.setItem('alertConfig', JSON.stringify(newConfig));
      console.log('✅ Alert config saved');
    } catch (error) {
      console.error('Failed to save alert config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Load config on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('alertConfig');
      if (saved) {
        const loadedConfig = JSON.parse(saved);
        setConfig(loadedConfig);
        AlertTierSystem.setConfig(loadedConfig);
      }
    } catch (error) {
      console.error('Failed to load alert config:', error);
    }
  }, []);

  const isCurrentlyQuietHours = AlertTierSystem.isQuietHours();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Moon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Quiet Hours</h3>
            <p className="text-sm text-gray-600">
              Suppress non-critical alerts during specified hours
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleQuietHours}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
            config.quietHoursEnabled ? 'bg-indigo-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              config.quietHoursEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Status Indicator */}
      {config.quietHoursEnabled && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            isCurrentlyQuietHours
              ? 'bg-purple-50 border border-purple-200'
              : 'bg-gray-50 border border-gray-200'
          }`}
        >
          {isCurrentlyQuietHours ? (
            <>
              <BellOff className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                Quiet hours active - Critical alerts only
              </span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                All alerts enabled
              </span>
            </>
          )}
        </div>
      )}

      {/* Time Configuration */}
      {config.quietHoursEnabled && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={config.quietHoursStart}
              onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={config.quietHoursEnd}
              onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900">
          <strong>Note:</strong> Critical alerts (patient deterioration, critical labs) will
          always be shown, regardless of quiet hours settings. This ensures patient safety
          is never compromised.
        </p>
      </div>

      {isSaving && (
        <p className="text-xs text-gray-500 mt-2 text-center">Saving...</p>
      )}
    </div>
  );
}

import { Lock, Unlock, AlertTriangle, User } from 'lucide-react';
import useModeStore, { MODES } from '../../stores/modeStore';
import { modeCapabilities } from '../../config/modeConfig';

/**
 * GlanceHeader - Always visible clinical context header
 * Shows current mode, selected patient, and critical alerts
 */
export default function GlanceHeader() {
  const {
    currentMode,
    isModeLocked,
    modeContext,
    toggleModeLock,
  } = useModeStore();

  const capabilities = modeCapabilities[currentMode];
  const { selectedPatient, criticalAlerts } = modeContext;
  const alertCount = criticalAlerts?.length || 0;

  const getModeLabel = () => {
    switch (currentMode) {
      case MODES.WARD:
        return 'WARD';
      case MODES.EMERGENCY:
        return 'ACUTE';
      case MODES.CLINIC:
        return 'CLINIC';
      default:
        return 'MODE';
    }
  };

  const getModeColor = () => {
    return capabilities?.theme?.primary || '#0284c7';
  };

  return (
    <div
      className="sticky top-0 z-40 bg-white border-b shadow-sm"
      style={{ borderBottomColor: getModeColor() + '40' }}
    >
      <div className="flex items-center justify-between px-4 py-2 max-w-screen-xl mx-auto">
        {/* Left: Mode Lock + Badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleModeLock}
            className={`p-1.5 rounded-lg transition-colors ${
              isModeLocked
                ? 'bg-amber-100 text-amber-700'
                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }`}
            title={isModeLocked ? 'Mode locked - long press to switch' : 'Mode unlocked'}
          >
            {isModeLocked ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
          </button>

          <span
            className="px-2.5 py-1 text-xs font-bold rounded-md text-white uppercase tracking-wider"
            style={{ backgroundColor: getModeColor() }}
          >
            {getModeLabel()}
          </span>
        </div>

        {/* Center: Patient Display */}
        <div className="flex-1 mx-4 text-center">
          {selectedPatient ? (
            <div className="flex items-center justify-center gap-2">
              <User className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-800 truncate max-w-[200px]">
                {selectedPatient.name}
              </span>
              {selectedPatient.ward && (
                <span className="text-xs text-neutral-400">
                  · {selectedPatient.ward}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-neutral-400">No patient selected</span>
          )}
        </div>

        {/* Right: Alerts */}
        <div className="flex items-center">
          {alertCount > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">{alertCount} Alert{alertCount !== 1 ? 's' : ''}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-600 rounded-lg">
              <span className="text-xs font-medium">All Clear</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

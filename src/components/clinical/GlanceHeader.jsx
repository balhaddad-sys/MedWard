import { Lock, Unlock, AlertTriangle, User } from 'lucide-react';
import useModeStore from '../../stores/modeStore';
import { MODE_META } from '../../config/modeConfig';

export default function GlanceHeader() {
  const currentMode = useModeStore((s) => s.currentMode);
  const isModeLocked = useModeStore((s) => s.isModeLocked);
  const toggleModeLock = useModeStore((s) => s.toggleModeLock);
  const selectedPatient = useModeStore((s) => s.modeContext.selectedPatient);
  const criticalAlerts = useModeStore((s) => s.modeContext.criticalAlerts);

  const meta = MODE_META[currentMode];
  const alertCount = criticalAlerts.length;

  return (
    <div className={`flex items-center justify-between px-4 py-2 ${meta.bgClass} border-b ${meta.borderClass}`}>
      {/* Left: Mode badge + patient */}
      <div className="flex items-center gap-3 min-w-0">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${meta.badgeBg} ${meta.textClass}`}>
          <span className="w-2 h-2 rounded-full bg-current" />
          {meta.label}
        </span>

        {selectedPatient && (
          <div className="flex items-center gap-1.5 text-sm text-neutral-700 truncate">
            <User className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            <span className="font-medium truncate">{selectedPatient.name}</span>
            {selectedPatient.currentStatus === 'Critical' && (
              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
                CRITICAL
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Alerts + lock */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {alertCount > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {alertCount}
          </span>
        )}

        <button
          onClick={toggleModeLock}
          className={`p-1.5 rounded-lg transition-colors ${
            isModeLocked
              ? 'bg-neutral-800 text-white'
              : 'bg-white/60 text-neutral-500 hover:bg-white'
          }`}
          title={isModeLocked ? 'Unlock mode switching' : 'Lock current mode'}
        >
          {isModeLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

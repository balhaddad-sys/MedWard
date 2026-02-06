import { useState, useRef, useCallback } from 'react';
import useModeStore from '../../stores/modeStore';
import { MODES, MODE_META } from '../../config/modeConfig';
import { logModeSwitch } from '../../utils/sessionManager';

const LONG_PRESS_MS = 600;

export default function ModeSwitcher() {
  const currentMode = useModeStore((s) => s.currentMode);
  const isModeLocked = useModeStore((s) => s.isModeLocked);
  const setMode = useModeStore((s) => s.setMode);
  const selectedPatient = useModeStore((s) => s.modeContext.selectedPatient);

  const [holdProgress, setHoldProgress] = useState(null);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  const handleModeSwitch = useCallback(
    (mode) => {
      if (mode === currentMode) return;

      const switched = setMode(mode);
      if (switched) {
        logModeSwitch(currentMode, mode, selectedPatient?.id);
      }
    },
    [currentMode, setMode, selectedPatient]
  );

  const startHold = useCallback(
    (mode) => {
      if (!isModeLocked) {
        handleModeSwitch(mode);
        return;
      }

      // Long-press to override lock
      let progress = 0;
      setHoldProgress({ mode, pct: 0 });

      intervalRef.current = setInterval(() => {
        progress += 100 / (LONG_PRESS_MS / 50);
        setHoldProgress({ mode, pct: Math.min(progress, 100) });
      }, 50);

      timerRef.current = setTimeout(() => {
        clearInterval(intervalRef.current);
        setHoldProgress(null);
        // Force unlock then switch
        useModeStore.getState().setModeLock(false);
        handleModeSwitch(mode);
      }, LONG_PRESS_MS);
    },
    [isModeLocked, handleModeSwitch]
  );

  const cancelHold = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    setHoldProgress(null);
  }, []);

  const modes = [MODES.WARD, MODES.EMERGENCY, MODES.CLINIC];

  return (
    <div className="flex bg-neutral-100 rounded-xl p-1 gap-1">
      {modes.map((mode) => {
        const meta = MODE_META[mode];
        const isActive = mode === currentMode;
        const isHolding = holdProgress?.mode === mode;

        return (
          <button
            key={mode}
            onPointerDown={() => startHold(mode)}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            className={`relative flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all overflow-hidden
              ${isActive
                ? `bg-white shadow-sm ${meta.textClass}`
                : 'text-neutral-500 hover:text-neutral-700'
              }
              ${isModeLocked && !isActive ? 'opacity-50' : ''}
            `}
          >
            {/* Hold progress indicator */}
            {isHolding && (
              <div
                className="absolute inset-0 bg-neutral-200/60 origin-left transition-transform"
                style={{ transform: `scaleX(${(holdProgress?.pct || 0) / 100})` }}
              />
            )}

            <span className="relative z-10">{meta.label}</span>

            {isModeLocked && !isActive && (
              <span className="block text-[10px] text-neutral-400 mt-0.5 relative z-10">
                Hold to switch
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

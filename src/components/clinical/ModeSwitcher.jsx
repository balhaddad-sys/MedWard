import { useState, useRef, useCallback } from 'react';
import { Building2, Siren, Stethoscope } from 'lucide-react';
import useModeStore, { MODES } from '../../stores/modeStore';
import { modeCapabilities } from '../../config/modeConfig';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const MODE_CONFIG = [
  {
    id: MODES.WARD,
    label: 'Ward',
    icon: Building2,
    description: 'Daily rounds & patient management',
  },
  {
    id: MODES.EMERGENCY,
    label: 'Acute',
    icon: Siren,
    description: 'Emergency protocols & rapid response',
  },
  {
    id: MODES.CLINIC,
    label: 'Clinic',
    icon: Stethoscope,
    description: 'Outpatient care & longitudinal tracking',
  },
];

const LONG_PRESS_DURATION = 800; // ms

/**
 * ModeSwitcher - Mode selection tabs with lock protection
 */
export default function ModeSwitcher() {
  const { currentMode, setMode, isModeLocked, modeContext, updateContext } = useModeStore();
  const [pendingMode, setPendingMode] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPatientSelect, setShowPatientSelect] = useState(false);
  const longPressTimer = useRef(null);
  const isPressing = useRef(false);

  const handleModeSelect = useCallback(
    (modeId) => {
      if (modeId === currentMode) return;

      // Emergency mode requires patient selection confirmation
      if (modeId === MODES.EMERGENCY && !modeContext.selectedPatient) {
        setPendingMode(modeId);
        setShowPatientSelect(true);
        return;
      }

      setMode(modeId);
      triggerHaptic('medium');
    },
    [currentMode, modeContext.selectedPatient, setMode]
  );

  const handleMouseDown = (modeId) => {
    if (modeId === currentMode) return;

    isPressing.current = true;

    if (isModeLocked) {
      // Require long press when locked
      longPressTimer.current = setTimeout(() => {
        if (isPressing.current) {
          setPendingMode(modeId);
          setShowConfirm(true);
          triggerHaptic('heavy');
        }
      }, LONG_PRESS_DURATION);
    }
  };

  const handleMouseUp = (modeId) => {
    clearTimeout(longPressTimer.current);

    if (isPressing.current && !isModeLocked) {
      handleModeSelect(modeId);
    }

    isPressing.current = false;
  };

  const handleConfirmSwitch = () => {
    if (pendingMode) {
      // Check if emergency mode needs patient selection
      if (pendingMode === MODES.EMERGENCY && !modeContext.selectedPatient) {
        setShowConfirm(false);
        setShowPatientSelect(true);
        return;
      }

      setMode(pendingMode);
      triggerHaptic('success');
    }
    setShowConfirm(false);
    setPendingMode(null);
  };

  const handleSelectNoPatient = () => {
    updateContext('toolScope', 'general');
    setMode(pendingMode || MODES.EMERGENCY);
    setShowPatientSelect(false);
    setPendingMode(null);
    triggerHaptic('medium');
  };

  const handleCancelPatientSelect = () => {
    setShowPatientSelect(false);
    setPendingMode(null);
  };

  const triggerHaptic = (type) => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 50,
        medium: 100,
        heavy: 200,
        success: [50, 30, 50],
      };
      navigator.vibrate(patterns[type] || 50);
    }
  };

  return (
    <>
      <div
        className="flex bg-neutral-100 rounded-xl p-1 shadow-inner"
        role="tablist"
        aria-label="Clinical Mode Selection"
      >
        {MODE_CONFIG.map((mode) => {
          const isActive = currentMode === mode.id;
          const capabilities = modeCapabilities[mode.id];
          const Icon = mode.icon;

          return (
            <button
              key={mode.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${mode.id}-content`}
              onMouseDown={() => handleMouseDown(mode.id)}
              onMouseUp={() => handleMouseUp(mode.id)}
              onMouseLeave={() => {
                clearTimeout(longPressTimer.current);
                isPressing.current = false;
              }}
              onTouchStart={() => handleMouseDown(mode.id)}
              onTouchEnd={() => handleMouseUp(mode.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
                font-semibold text-sm transition-all duration-200 select-none
                ${
                  isActive
                    ? 'bg-white shadow-md text-neutral-900 scale-[1.02]'
                    : 'text-neutral-500 hover:text-neutral-700 active:scale-95'
                }
              `}
              style={
                isActive
                  ? { color: capabilities?.theme?.primary }
                  : undefined
              }
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Lock Confirmation Modal */}
      {showConfirm && (
        <Modal
          open
          onClose={() => {
            setShowConfirm(false);
            setPendingMode(null);
          }}
          title="Switch Mode?"
        >
          <div className="space-y-4">
            <p className="text-neutral-600">
              Mode is currently locked. Are you sure you want to switch to{' '}
              <strong>{MODE_CONFIG.find((m) => m.id === pendingMode)?.label}</strong> mode?
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConfirm(false);
                  setPendingMode(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmSwitch} className="flex-1">
                Switch Mode
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Emergency Mode Patient Selection */}
      {showPatientSelect && (
        <Modal
          open
          onClose={handleCancelPatientSelect}
          title="Emergency Mode Setup"
        >
          <div className="space-y-4">
            <p className="text-neutral-600">
              Emergency mode works best with patient context. Choose an option:
            </p>

            <div className="space-y-3">
              <button
                onClick={handleSelectNoPatient}
                className="w-full p-4 text-left bg-neutral-50 hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors"
              >
                <div className="font-semibold text-neutral-900">General Tools</div>
                <div className="text-sm text-neutral-500 mt-1">
                  Access protocols without specific patient context
                </div>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-neutral-400">or</span>
                </div>
              </div>

              <p className="text-sm text-neutral-500 text-center">
                Select a patient from your ward list first, then switch to Emergency mode
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={handleCancelPatientSelect}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

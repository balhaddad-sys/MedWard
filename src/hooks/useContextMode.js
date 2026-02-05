import { useEffect } from 'react';
import useUIStore from '../stores/uiStore';
import { getCurrentMode } from '../utils/modeDetector';

export default function useContextMode() {
  const currentMode = useUIStore((s) => s.currentMode);
  const setMode = useUIStore((s) => s.setMode);

  useEffect(() => {
    // Check mode every minute
    const interval = setInterval(() => {
      const newMode = getCurrentMode();
      if (newMode !== currentMode) {
        setMode(newMode);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [currentMode, setMode]);

  return currentMode;
}

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import useModeStore from '../../stores/modeStore';
import usePatientStore from '../../stores/patientStore';
import { MODES } from '../../config/modeConfig';
import GlanceHeader from './GlanceHeader';
import ModeSwitcher from './ModeSwitcher';
import WardTaskPanel from './WardTaskPanel';
import AcuteDashboard from './AcuteDashboard';
import ClinicScribe from './ClinicScribe';

export default function ClinicalModeView() {
  const currentMode = useModeStore((s) => s.currentMode);
  const selectedPatient = useModeStore((s) => s.modeContext.selectedPatient);
  const isOffline = useModeStore((s) => s.isOffline);
  const setOffline = useModeStore((s) => s.setOffline);
  const patients = usePatientStore((s) => s.patients);

  // ── Online/Offline Listeners ────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);

  return (
    <div className="space-y-4">
      {/* Offline Banner */}
      {isOffline && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800">
          <WifiOff className="w-4 h-4" />
          <span className="text-xs font-semibold">Offline — Read-only mode. Changes will sync when reconnected.</span>
        </div>
      )}

      {/* Glance Header (mode badge, patient, alerts, lock, privacy) */}
      <GlanceHeader />

      {/* Mode Switcher */}
      <div className="px-4">
        <ModeSwitcher />
      </div>

      {/* Mode Content */}
      <div className="px-4 pb-4">
        {currentMode === MODES.WARD && (
          <WardTaskPanel patients={patients} />
        )}
        {currentMode === MODES.EMERGENCY && (
          <AcuteDashboard />
        )}
        {currentMode === MODES.CLINIC && (
          <ClinicScribe />
        )}
      </div>
    </div>
  );
}

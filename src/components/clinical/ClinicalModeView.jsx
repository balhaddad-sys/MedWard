import { Suspense, lazy } from 'react';
import useModeStore, { MODES } from '../../stores/modeStore';
import { modeCapabilities } from '../../config/modeConfig';
import GlanceHeader from './GlanceHeader';
import ModeSwitcher from './ModeSwitcher';
import EmergencyToolGrid from './EmergencyToolGrid';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import { Building2, Siren, Stethoscope, AlertTriangle } from 'lucide-react';

/**
 * ClinicalModeView - Main container for clinical mode content
 * Renders different views based on current mode
 */
export default function ClinicalModeView({ children }) {
  const { currentMode, modeContext } = useModeStore();
  const capabilities = modeCapabilities[currentMode];

  return (
    <div className="min-h-screen bg-neutral-50" data-mode={currentMode}>
      {/* Glance Header - Always visible */}
      <GlanceHeader />

      {/* Main Content Area */}
      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-4">
        {/* Mode Switcher */}
        <ModeSwitcher />

        {/* Mode-specific content */}
        <div className="min-h-[60vh]">
          {currentMode === MODES.WARD && <WardModeContent />}
          {currentMode === MODES.EMERGENCY && <EmergencyModeContent />}
          {currentMode === MODES.CLINIC && <ClinicModeContent />}
        </div>
      </div>

      {/* Mode-specific footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-2">
        <p className="text-center text-xs text-neutral-400">
          {capabilities?.name} · Educational Tool — Not for Clinical Decisions
        </p>
      </div>
    </div>
  );
}

/**
 * Ward Mode Content - Patient list and workflow
 */
function WardModeContent() {
  return (
    <div className="space-y-4">
      {/* Ward Mode Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 rounded-lg">
            <Building2 className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h2 className="font-bold text-neutral-900">Ward Rounds</h2>
            <p className="text-sm text-neutral-500">Manage your patients</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <QuickStat label="Patients" value="--" color="sky" />
        <QuickStat label="Pending Tasks" value="--" color="amber" />
        <QuickStat label="Labs Due" value="--" color="violet" />
      </div>

      {/* Placeholder for patient list */}
      <Card className="p-8 text-center">
        <Building2 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-600 font-medium">Ward Mode Active</p>
        <p className="text-sm text-neutral-400 mt-1">
          Navigate to Dashboard to view your patients
        </p>
      </Card>
    </div>
  );
}

/**
 * Emergency Mode Content - Tool grid for rapid protocols
 */
function EmergencyModeContent() {
  const { modeContext } = useModeStore();

  return (
    <div className="space-y-4">
      {/* Emergency Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-xl p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Siren className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Emergency Protocols</h2>
            <p className="text-sm text-white/80">
              {modeContext.selectedPatient
                ? `Patient: ${modeContext.selectedPatient.name}`
                : 'General Tools Mode'}
            </p>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Critical Care Mode.</strong> All tools require confirmation. Verify before acting.
        </p>
      </div>

      {/* Tool Grid */}
      <EmergencyToolGrid />
    </div>
  );
}

/**
 * Clinic Mode Content - Longitudinal patient view
 */
function ClinicModeContent() {
  return (
    <div className="space-y-4">
      {/* Clinic Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Stethoscope className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-neutral-900">Clinic View</h2>
            <p className="text-sm text-neutral-500">Longitudinal patient care</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <QuickStat label="Appointments" value="--" color="emerald" />
        <QuickStat label="Follow-ups" value="--" color="sky" />
        <QuickStat label="Pending" value="--" color="amber" />
      </div>

      {/* Placeholder */}
      <Card className="p-8 text-center">
        <Stethoscope className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-600 font-medium">Clinic Mode Active</p>
        <p className="text-sm text-neutral-400 mt-1">
          Select a patient to view longitudinal data and trends
        </p>
      </Card>
    </div>
  );
}

/**
 * Quick stat card component
 */
function QuickStat({ label, value, color = 'neutral' }) {
  const colorClasses = {
    sky: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    neutral: 'bg-neutral-50 text-neutral-600',
  };

  return (
    <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  );
}

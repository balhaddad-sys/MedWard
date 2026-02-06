import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useModeStore, { MODES } from '../stores/modeStore';
import { modeCapabilities } from '../config/modeConfig';
import GlanceHeader from '../components/clinical/GlanceHeader';
import ModeSwitcher from '../components/clinical/ModeSwitcher';
import EmergencyToolGrid from '../components/clinical/EmergencyToolGrid';
import Card from '../components/ui/Card';
import {
  Building2,
  Siren,
  Stethoscope,
  AlertTriangle,
  Users,
  ClipboardList,
  Activity,
} from 'lucide-react';

/**
 * ClinicalModesPage - Main entry point for clinical mode views
 * Provides mode-specific interfaces for Ward, Emergency, and Clinic workflows
 */
export default function ClinicalModesPage() {
  const { currentMode, modeContext, setMode } = useModeStore();
  const capabilities = modeCapabilities[currentMode];
  const navigate = useNavigate();

  // Set body data attribute for CSS theming
  useEffect(() => {
    document.body.setAttribute('data-mode', currentMode);
    return () => document.body.removeAttribute('data-mode');
  }, [currentMode]);

  return (
    <div className="space-y-4 pb-8">
      {/* Glance Header */}
      <GlanceHeader />

      {/* Mode Switcher */}
      <div className="px-1">
        <ModeSwitcher />
      </div>

      {/* Mode-specific content */}
      <div className="min-h-[60vh]">
        {currentMode === MODES.WARD && <WardModeContent navigate={navigate} />}
        {currentMode === MODES.EMERGENCY && <EmergencyModeContent />}
        {currentMode === MODES.CLINIC && <ClinicModeContent navigate={navigate} />}
      </div>

      {/* Mode footer */}
      <p className="text-center text-xs text-neutral-400 pt-4">
        {capabilities?.name} Mode · Educational Tool — Not for Clinical Decisions
      </p>
    </div>
  );
}

/**
 * Ward Mode - Patient management and rounds workflow
 */
function WardModeContent({ navigate }) {
  const { modeContext } = useModeStore();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 rounded-lg">
            <Building2 className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h2 className="font-bold text-neutral-900">Ward Rounds</h2>
            <p className="text-sm text-neutral-500">Daily patient management</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-4 bg-white border border-neutral-200 rounded-xl text-left hover:border-sky-300 hover:shadow-md transition-all"
        >
          <div className="p-2 bg-sky-100 rounded-lg w-fit mb-2">
            <Users className="w-5 h-5 text-sky-600" />
          </div>
          <span className="font-semibold text-neutral-900">My Patients</span>
          <p className="text-xs text-neutral-500 mt-1">View your ward list</p>
        </button>

        <button
          onClick={() => navigate('/ai')}
          className="p-4 bg-white border border-neutral-200 rounded-xl text-left hover:border-violet-300 hover:shadow-md transition-all"
        >
          <div className="p-2 bg-violet-100 rounded-lg w-fit mb-2">
            <ClipboardList className="w-5 h-5 text-violet-600" />
          </div>
          <span className="font-semibold text-neutral-900">AI Assist</span>
          <p className="text-xs text-neutral-500 mt-1">Clinical tools</p>
        </button>
      </div>

      {/* Current Patient Context */}
      {modeContext.selectedPatient ? (
        <Card className="border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Current Patient</p>
              <p className="font-bold text-neutral-900">
                {modeContext.selectedPatient.name}
              </p>
              {modeContext.selectedPatient.ward && (
                <p className="text-xs text-neutral-400">
                  {modeContext.selectedPatient.ward}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                if (modeContext.selectedPatient?.id) {
                  navigate(`/patient/${modeContext.selectedPatient.id}`);
                }
              }}
              className="px-3 py-1.5 bg-sky-100 text-sky-700 text-sm font-medium rounded-lg hover:bg-sky-200 transition-colors"
            >
              View Details
            </button>
          </div>
        </Card>
      ) : (
        <Card className="text-center py-6 bg-neutral-50 border-dashed">
          <Users className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-neutral-600 font-medium">No Patient Selected</p>
          <p className="text-sm text-neutral-400 mt-1">
            Select a patient from the dashboard to begin rounds
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-3 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </Card>
      )}

      {/* Workflow Tips */}
      <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
        <h4 className="font-semibold text-sky-900 mb-2">Ward Mode Tips</h4>
        <ul className="text-sm text-sky-800 space-y-1">
          <li>• Use morning rounds for pre-round prep (6-12pm)</li>
          <li>• Afternoon for task completion (12-6pm)</li>
          <li>• Evening for handover documentation (6-9pm)</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Emergency Mode - Rapid protocols and critical tools
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
          <strong>Critical Care Mode.</strong> All tools require confirmation before acting.
        </p>
      </div>

      {/* Emergency Tool Grid */}
      <EmergencyToolGrid />
    </div>
  );
}

/**
 * Clinic Mode - Longitudinal patient care
 */
function ClinicModeContent({ navigate }) {
  const { modeContext } = useModeStore();

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-4 bg-white border border-neutral-200 rounded-xl text-left hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div className="p-2 bg-emerald-100 rounded-lg w-fit mb-2">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="font-semibold text-neutral-900">Patient List</span>
          <p className="text-xs text-neutral-500 mt-1">View all patients</p>
        </button>

        <button
          onClick={() => navigate('/ai')}
          className="p-4 bg-white border border-neutral-200 rounded-xl text-left hover:border-teal-300 hover:shadow-md transition-all"
        >
          <div className="p-2 bg-teal-100 rounded-lg w-fit mb-2">
            <Activity className="w-5 h-5 text-teal-600" />
          </div>
          <span className="font-semibold text-neutral-900">Trend Analysis</span>
          <p className="text-xs text-neutral-500 mt-1">View lab trends</p>
        </button>
      </div>

      {/* Current Patient */}
      {modeContext.selectedPatient ? (
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">Selected Patient</p>
              <p className="font-bold text-neutral-900">
                {modeContext.selectedPatient.name}
              </p>
            </div>
            <button
              onClick={() => {
                if (modeContext.selectedPatient?.id) {
                  navigate(`/patient/${modeContext.selectedPatient.id}`);
                }
              }}
              className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-200 transition-colors"
            >
              View History
            </button>
          </div>
        </Card>
      ) : (
        <Card className="text-center py-6 bg-neutral-50 border-dashed">
          <Stethoscope className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-neutral-600 font-medium">No Patient Selected</p>
          <p className="text-sm text-neutral-400 mt-1">
            Select a patient to view their longitudinal data
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Select Patient
          </button>
        </Card>
      )}

      {/* Clinic Mode Info */}
      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
        <h4 className="font-semibold text-emerald-900 mb-2">Clinic Mode Features</h4>
        <ul className="text-sm text-emerald-800 space-y-1">
          <li>• Long-term trend visualization</li>
          <li>• Chronic disease management tools</li>
          <li>• Follow-up scheduling integration</li>
        </ul>
      </div>
    </div>
  );
}

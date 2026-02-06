import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Stethoscope, Clock, Users, Plus, ChevronRight } from 'lucide-react';
import useModeStore from '../../stores/modeStore';
import usePatientStore from '../../stores/patientStore';
import { MODES, MODE_META, getToolsForMode } from '../../config/modeConfig';
import { sortByPriority } from '../../utils/priorityStack';
import GlanceHeader from './GlanceHeader';
import ModeSwitcher from './ModeSwitcher';
import EmergencyToolGrid from './EmergencyToolGrid';
import labService from '../../services/labService';

export default function ClinicalModeView() {
  const currentMode = useModeStore((s) => s.currentMode);
  const selectedPatient = useModeStore((s) => s.modeContext.selectedPatient);
  const meta = MODE_META[currentMode];

  return (
    <div className="space-y-4">
      <GlanceHeader />

      <div className="px-4">
        <ModeSwitcher />
      </div>

      <div className="px-4">
        {currentMode === MODES.WARD && (
          <WardModeContent patient={selectedPatient} />
        )}
        {currentMode === MODES.EMERGENCY && (
          <EmergencyModeContent patient={selectedPatient} />
        )}
        {currentMode === MODES.CLINIC && (
          <ClinicModeContent patient={selectedPatient} />
        )}
      </div>
    </div>
  );
}

// ─── Ward Mode ───────────────────────────────────────────────────────────────

function WardModeContent({ patient }) {
  const navigate = useNavigate();
  const patients = usePatientStore((s) => s.patients);
  const setSelectedPatient = useModeStore((s) => s.setSelectedPatient);

  const criticalPatients = patients.filter((p) => p.currentStatus === 'Critical');
  const watchPatients = patients.filter((p) => p.currentStatus === 'Watch');

  const quickTools = sortByPriority(getToolsForMode(MODES.WARD), {
    patient,
    mode: 'ward',
  }).slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Ward Overview Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Total"
          value={patients.length}
          icon={<Users className="w-4 h-4" />}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Critical"
          value={criticalPatients.length}
          icon={<Activity className="w-4 h-4" />}
          color="bg-red-50 text-red-700"
        />
        <StatCard
          label="Watch"
          value={watchPatients.length}
          icon={<Clock className="w-4 h-4" />}
          color="bg-amber-50 text-amber-700"
        />
      </div>

      {/* Quick Actions */}
      {quickTools.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">
            Suggested Tools
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {quickTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => navigate('/ai')}
                className="flex items-center gap-2 p-3 bg-white border border-neutral-200 rounded-xl text-left hover:bg-neutral-50 transition-colors"
              >
                <Stethoscope className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-neutral-700 truncate">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Critical Patients List */}
      {criticalPatients.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">
            Critical Patients
          </h3>
          <div className="space-y-2">
            {criticalPatients.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPatient(p);
                  navigate(`/patient/${p.id}`);
                }}
                className="w-full flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl text-left hover:bg-red-100 transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-neutral-900 block truncate">{p.name}</span>
                  <span className="text-xs text-neutral-500">{p.diagnosis} · {p.ward}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rest of patients */}
      {patients.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">
            All Patients ({patients.length})
          </h3>
          <div className="space-y-1.5">
            {patients.slice(0, 10).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPatient(p);
                  navigate(`/patient/${p.id}`);
                }}
                className="w-full flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-xl text-left hover:bg-neutral-50 transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-neutral-800 block truncate">{p.name}</span>
                  <span className="text-xs text-neutral-500">{p.ageSex} · {p.ward}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.currentStatus === 'Critical' && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">CRIT</span>
                  )}
                  {p.currentStatus === 'Watch' && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">WATCH</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-neutral-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Emergency Mode ──────────────────────────────────────────────────────────

function EmergencyModeContent({ patient }) {
  const [labs, setLabs] = useState([]);

  useEffect(() => {
    if (!patient?.id) return;
    const unsub = labService.subscribe(patient.id, setLabs);
    return () => unsub();
  }, [patient?.id]);

  return (
    <div className="space-y-4">
      {!patient && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-800 font-medium">
            No patient selected — showing general emergency protocols
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Select a patient from the dashboard to get context-aware tools
          </p>
        </div>
      )}

      <EmergencyToolGrid patient={patient} labs={labs} />
    </div>
  );
}

// ─── Clinic Mode ─────────────────────────────────────────────────────────────

function ClinicModeContent({ patient }) {
  const navigate = useNavigate();
  const patients = usePatientStore((s) => s.patients);
  const setSelectedPatient = useModeStore((s) => s.setSelectedPatient);

  const quickTools = sortByPriority(getToolsForMode(MODES.CLINIC), {
    patient,
    mode: 'clinic',
  }).slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Clinic Quick Tools */}
      <div>
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">
          Clinic Tools
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {quickTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => navigate('/ai')}
              className="flex items-center gap-2 p-3 bg-white border border-emerald-200 rounded-xl text-left hover:bg-emerald-50 transition-colors"
            >
              <Stethoscope className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-neutral-700 truncate">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Patient List */}
      {patients.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">
            Patients ({patients.length})
          </h3>
          <div className="space-y-1.5">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPatient(p);
                  navigate(`/patient/${p.id}`);
                }}
                className="w-full flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-xl text-left hover:bg-neutral-50 transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-neutral-800 block truncate">{p.name}</span>
                  <span className="text-xs text-neutral-500">{p.ageSex} · {p.diagnosis}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {patients.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <p className="text-sm text-emerald-700">No patients yet. Add patients from the dashboard.</p>
        </div>
      )}
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`flex flex-col items-center p-3 rounded-xl ${color}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xl font-bold">{value}</span>
      </div>
      <span className="text-[11px] font-medium opacity-75">{label}</span>
    </div>
  );
}

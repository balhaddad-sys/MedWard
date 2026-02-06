import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Users } from 'lucide-react';
import usePatients from '../hooks/usePatients';
import useWardStore from '../stores/wardStore';
import useUIStore from '../stores/uiStore';
import useModeStore from '../stores/modeStore';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import PatientCard from '../components/patients/PatientCard';
import PatientForm from '../components/patients/PatientForm';
import ClinicalModeView from '../components/clinical/ClinicalModeView';
import { MODES } from '../config/modeConfig';
import { useState } from 'react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { patients, criticalPatients, watchPatients, stablePatients, loading } = usePatients();
  const wards = useWardStore((s) => s.wards);
  const currentMode = useUIStore((s) => s.currentMode);
  const clinicalMode = useModeStore((s) => s.currentMode);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showClinicalMode, setShowClinicalMode] = useState(false);

  if (loading) return <Spinner size="lg" />;

  // In on-call mode, only show unstable patients
  const displayPatients =
    currentMode === 'oncall'
      ? [...criticalPatients, ...watchPatients]
      : patients;

  // Clinical Mode View
  if (showClinicalMode) {
    return (
      <div className="-mx-4 -mt-4">
        <ClinicalModeView />
        <div className="px-4 pt-4 pb-4">
          <button
            onClick={() => setShowClinicalMode(false)}
            className="w-full py-2.5 text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
        <p className="text-center text-xs text-neutral-400 pb-4">
          Educational Tool — Not for Clinical Decisions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clinical Mode Banner */}
      <button
        onClick={() => setShowClinicalMode(true)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all"
      >
        <div className="text-left">
          <span className="text-sm font-bold text-blue-800">Clinical Mode</span>
          <span className="block text-xs text-blue-600 mt-0.5">
            Ward · Emergency · Clinic — context-aware tools
          </span>
        </div>
        <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
          Open
        </span>
      </button>

      {/* Critical Now Section */}
      {criticalPatients.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-critical-red uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Critical Now ({criticalPatients.length})
          </h2>
          <div className="space-y-2">
            {criticalPatients.map((p) => (
              <PatientCard
                key={p.id}
                patient={p}
                onClick={() => navigate(`/patient/${p.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ward Tiles */}
      <section>
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wide mb-3">
          My Wards
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {wards.map((ward) => {
            const wardPatients = patients.filter((p) => p.ward === ward);
            const critical = wardPatients.filter((p) => p.currentStatus === 'Critical').length;
            const watch = wardPatients.filter((p) => p.currentStatus === 'Watch').length;

            return (
              <Card
                key={ward}
                hover
                onClick={() => navigate(`/ward/${encodeURIComponent(ward)}`)}
                className="text-center"
              >
                <Users className="w-5 h-5 text-neutral-400 mx-auto mb-2" />
                <p className="font-semibold text-neutral-800">{ward}</p>
                <p className="text-xs text-neutral-500 mt-1">{wardPatients.length} patients</p>
                <div className="flex justify-center gap-2 mt-2">
                  {critical > 0 && <Badge variant="critical">{critical}</Badge>}
                  {watch > 0 && <Badge variant="watch">{watch}</Badge>}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* All Patients */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">
            {currentMode === 'oncall' ? 'Unstable Patients' : 'All Patients'}
            <span className="ml-2 text-neutral-400">({displayPatients.length})</span>
          </h2>
          <button
            onClick={() => setShowAddPatient(true)}
            className="flex items-center gap-1 text-sm font-medium text-trust-blue hover:text-trust-blue-light"
          >
            <Plus className="w-4 h-4" />
            Add Patient
          </button>
        </div>
        <div className="space-y-2">
          {displayPatients.map((p) => (
            <PatientCard
              key={p.id}
              patient={p}
              onClick={() => navigate(`/patient/${p.id}`)}
            />
          ))}
          {displayPatients.length === 0 && (
            <Card className="text-center py-8 text-neutral-400">
              No patients yet. Tap "Add Patient" to get started.
            </Card>
          )}
        </div>
      </section>

      {/* Add Patient Modal */}
      {showAddPatient && (
        <PatientForm onClose={() => setShowAddPatient(false)} />
      )}

      {/* Footer disclaimer */}
      <p className="text-center text-xs text-neutral-400 pt-4">
        Educational Tool — Not for Clinical Decisions
      </p>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Users } from 'lucide-react';
import usePatients from '../hooks/usePatients';
import useWardStore from '../stores/wardStore';
import useUIStore from '../stores/uiStore';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import PatientCard from '../components/patients/PatientCard';
import PatientForm from '../components/patients/PatientForm';
import { useState } from 'react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { patients, criticalPatients, watchPatients, stablePatients, loading, error } = usePatients();
  const wards = useWardStore((s) => s.wards);
  const currentMode = useUIStore((s) => s.currentMode);
  const [showAddPatient, setShowAddPatient] = useState(false);

  if (loading) return <Spinner size="lg" />;

  // In on-call mode, only show unstable patients
  const displayPatients =
    currentMode === 'oncall'
      ? [...criticalPatients, ...watchPatients]
      : patients;

  return (
    <div className="space-y-6">
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

      {/* Firestore query error */}
      {error && (
        <Card className="bg-red-50 border-red-200 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Failed to load patients</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </Card>
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

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, AlertTriangle } from 'lucide-react';
import usePatients from '../hooks/usePatients';
import Spinner from '../components/ui/Spinner';
import PatientCard from '../components/patients/PatientCard';
import PatientForm from '../components/patients/PatientForm';
import Card from '../components/ui/Card';
import { useState } from 'react';

export default function WardPage() {
  const { wardId } = useParams();
  const navigate = useNavigate();
  const { patients, loading, error } = usePatients(decodeURIComponent(wardId));
  const [showAddPatient, setShowAddPatient] = useState(false);

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1 rounded-lg hover:bg-neutral-100">
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-neutral-900">{decodeURIComponent(wardId)}</h1>
            <p className="text-sm text-neutral-500">{patients.length} patients</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddPatient(true)}
          className="flex items-center gap-1 text-sm font-medium text-trust-blue hover:text-trust-blue-light"
        >
          <Plus className="w-4 h-4" />
          Add Patient
        </button>
      </div>

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

      <div className="space-y-2">
        {patients.map((p) => (
          <PatientCard
            key={p.id}
            patient={p}
            onClick={() => navigate(`/patient/${p.id}`)}
          />
        ))}
        {!error && patients.length === 0 && (
          <Card className="text-center py-8 text-neutral-400">
            No patients in this ward.
          </Card>
        )}
      </div>

      {showAddPatient && (
        <PatientForm onClose={() => setShowAddPatient(false)} defaultWard={decodeURIComponent(wardId)} />
      )}

      <p className="text-center text-xs text-neutral-400 pt-4">
        Educational Tool — Not for Clinical Decisions
      </p>
    </div>
  );
}

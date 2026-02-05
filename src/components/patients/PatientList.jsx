import PatientCard from './PatientCard';
import { useNavigate } from 'react-router-dom';

export default function PatientList({ patients }) {
  const navigate = useNavigate();

  if (patients.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-400 text-sm">
        No patients found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {patients.map((patient) => (
        <PatientCard
          key={patient.id}
          patient={patient}
          onClick={() => navigate(`/patient/${patient.id}`)}
        />
      ))}
    </div>
  );
}

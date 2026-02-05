import StatusBadge from '../ui/StatusBadge';
import { ArrowLeft, FileDown, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDayOfAdmission } from '../../utils/formatters';

export default function PatientHeader({ patient, onEdit, onExport }) {
  const navigate = useNavigate();
  const dayOfAdmission = getDayOfAdmission(patient.admissionDate || patient.createdAt);

  return (
    <div className="sticky top-14 z-20 bg-white border-b border-neutral-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-neutral-100">
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900">{patient.name}</h1>
              <StatusBadge status={patient.currentStatus} />
            </div>
            <p className="text-sm text-neutral-500">
              {patient.ageSex} · {patient.ward} · {patient.diagnosis}
              {dayOfAdmission && ` · Day ${dayOfAdmission}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button onClick={onEdit} className="p-2 rounded-lg hover:bg-neutral-100">
              <Edit className="w-4 h-4 text-neutral-500" />
            </button>
          )}
          {onExport && (
            <button onClick={onExport} className="p-2 rounded-lg hover:bg-neutral-100">
              <FileDown className="w-4 h-4 text-neutral-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

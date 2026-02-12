/**
 * Unstable Patient Card (Phase 2)
 *
 * Displays unstable patient with quick action buttons
 * Shows key vitals, acuity, and primary diagnosis
 */

import { useNavigate } from 'react-router-dom';
import { User, Bed, Activity, FileText } from 'lucide-react';
import type { Patient } from '@/types';
import { ACUITY_LEVELS } from '@/config/constants';

interface UnstablePatientCardProps {
  patient: Patient;
  onReview: () => void;
}

export function UnstablePatientCard({ patient, onReview }: UnstablePatientCardProps) {
  const navigate = useNavigate();

  const handleViewPatient = () => {
    navigate(`/patients/${patient.id}`);
    onReview();
  };

  const acuityColor = patient.acuity <= 2 ? 'text-red-600' : 'text-orange-600';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-start justify-between">
        {/* Patient Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-lg text-gray-900">
                {patient.firstName} {patient.lastName}
              </h3>
            </div>
            <span className={`text-sm font-medium ${acuityColor}`}>
              Acuity {patient.acuity}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Bed className="w-4 h-4" />
              <span>Bed {patient.bedNumber || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <FileText className="w-4 h-4" />
              <span className="truncate">{patient.primaryDiagnosis || 'No diagnosis'}</span>
            </div>
          </div>

          {/* State Changed Info */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Activity className="w-3 h-3" />
            <span>
              Marked unstable{' '}
              {patient.stateChangedAt
                ? new Date(
                    typeof patient.stateChangedAt === 'object' && 'toDate' in patient.stateChangedAt
                      ? patient.stateChangedAt.toDate()
                      : patient.stateChangedAt
                  ).toLocaleString()
                : 'recently'}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={handleViewPatient}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 whitespace-nowrap"
          >
            Review Now
          </button>
        </div>
      </div>
    </div>
  );
}

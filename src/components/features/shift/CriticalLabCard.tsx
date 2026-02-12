/**
 * Critical Lab Card (Phase 2)
 *
 * Displays critical unreviewedlab result with review button
 * Shows patient, lab panel, and critical values
 */

import { useNavigate } from 'react-router-dom';
import { FlaskConical, User, AlertTriangle, Eye } from 'lucide-react';
import type { LabPanel } from '@/types';

interface CriticalLabCardProps {
  lab: LabPanel;
  onReview: () => void;
}

export function CriticalLabCard({ lab, onReview }: CriticalLabCardProps) {
  const navigate = useNavigate();

  const handleReview = () => {
    // TODO: Navigate to patient labs tab and mark as reviewed
    // navigate(`/patients/${lab.patientId}/labs`);
    // await markLabAsReviewed(lab.id);
    console.log('Review lab:', lab.id);
    onReview();
  };

  // Extract critical values
  const criticalValues = lab.values?.filter((v) => v.isCritical) || [];

  return (
    <div className="bg-white rounded-lg border-2 border-red-300 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-start justify-between">
        {/* Lab Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-red-50">
              <FlaskConical className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{lab.panelName}</h3>
              <p className="text-sm text-gray-600">{lab.category}</p>
            </div>
          </div>

          {/* Critical Values */}
          {criticalValues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-900">
                  Critical Values ({criticalValues.length})
                </span>
              </div>
              <div className="space-y-1">
                {criticalValues.slice(0, 3).map((value, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-red-800 font-medium">{value.name}:</span>
                    <span className="text-red-700 font-semibold">
                      {value.value} {value.unit}
                      {value.referenceRange && (
                        <span className="text-xs text-red-600 ml-2">
                          (Ref: {value.referenceRange})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
                {criticalValues.length > 3 && (
                  <p className="text-xs text-red-600 mt-1">
                    +{criticalValues.length - 3} more critical values
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Patient Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>
              Patient: {lab.patientId}
              {/* TODO: Show patient name when available */}
            </span>
          </div>

          {/* Timestamp */}
          <div className="mt-2 text-xs text-gray-500">
            Resulted:{' '}
            {lab.resultedAt
              ? new Date(
                  typeof lab.resultedAt === 'object' && 'toDate' in lab.resultedAt
                    ? lab.resultedAt.toDate()
                    : lab.resultedAt
                ).toLocaleString()
              : 'Recently'}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={handleReview}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 whitespace-nowrap flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Review
          </button>
        </div>
      </div>
    </div>
  );
}

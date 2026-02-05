import StatusBadge from '../ui/StatusBadge';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PatientCard({ patient, onClick }) {
  const updatedAt = patient.updatedAt?.toDate
    ? formatDistanceToNow(patient.updatedAt.toDate(), { addSuffix: true })
    : '';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-neutral-200 p-4 cursor-pointer
                 hover:border-trust-blue-light hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-neutral-900 truncate">{patient.name}</h3>
            <StatusBadge status={patient.currentStatus} />
          </div>
          <p className="text-sm text-neutral-500 mt-0.5">
            {patient.ageSex} · {patient.diagnosis} · {patient.ward}
          </p>
          {patient.lastUpdateSummary && (
            <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {patient.lastUpdateSummary} · {updatedAt}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 ml-3">
          {patient.hasCriticalLabs && (
            <span className="text-critical-red flex items-center gap-1 text-xs font-semibold">
              <AlertTriangle className="w-3 h-3" />
              Critical Lab
            </span>
          )}
          {patient.onOxygen && (
            <span className="text-xs text-guarded-amber font-medium">
              O2: {patient.lastVitals?.o2Delivery || 'Yes'}
            </span>
          )}
        </div>
      </div>

      {/* Active Alerts */}
      {patient.activeAlerts?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {patient.activeAlerts.map((alert) => (
            <span
              key={alert}
              className="text-xs bg-guarded-amber-bg text-guarded-amber px-2 py-0.5 rounded-full font-medium"
            >
              {alert}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

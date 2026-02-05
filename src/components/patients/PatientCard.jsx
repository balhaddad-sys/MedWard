import { memo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  FileText, 
  MoreVertical,
  Pill,
  TestTube,
  ChevronRight
} from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import { PATIENT_STATUS } from '../../config/constants';

/**
 * PatientCard Component
 * Displays patient summary in list view
 * 
 * @param {object} patient - Patient data object
 * @param {function} onClick - Click handler
 * @param {function} onQuickAction - Quick action handler (labs, meds, etc.)
 * @param {boolean} compact - Compact mode for smaller displays
 */
export const PatientCard = memo(function PatientCard({
  patient,
  onClick,
  onQuickAction,
  compact = false,
}) {
  const {
    id,
    name,
    fileNumber,
    age,
    sex,
    bed,
    ward,
    diagnosis,
    status = 'stable',
    vitals = {},
    updatedAt,
  } = patient;

  // Get status color class
  const statusColors = {
    critical: 'patient-critical',
    guarded: 'patient-guarded',
    stable: 'patient-stable',
  };

  // Format last updated time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleQuickAction = (e, action) => {
    e.stopPropagation();
    onQuickAction?.(action, patient);
  };

  if (compact) {
    return (
      <div 
        className={`patient-row ${statusColors[status]}`}
        onClick={() => onClick?.(patient)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.(patient)}
      >
        <div className="patient-row-status">
          <span className={`status-dot status-${status}`} />
        </div>
        <div className="patient-row-info">
          <span className="patient-name">{name}</span>
          <span className="patient-meta">{bed} • {diagnosis}</span>
        </div>
        <ChevronRight size={18} className="patient-row-chevron" />
      </div>
    );
  }

  return (
    <div 
      className={`patient-card ${statusColors[status]}`}
      onClick={() => onClick?.(patient)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(patient)}
    >
      {/* Status Indicator */}
      <div className={`patient-card-status status-${status}`} />
      
      {/* Main Content */}
      <div className="patient-card-content">
        {/* Header */}
        <div className="patient-card-header">
          <div className="patient-identity">
            <h3 className="patient-name">{name}</h3>
            <span className="patient-demographics">
              {age}y/{sex} • #{fileNumber}
            </span>
          </div>
          <div className="patient-location">
            <span className="patient-bed">{bed}</span>
            <span className="patient-ward">{ward}</span>
          </div>
        </div>

        {/* Diagnosis */}
        <div className="patient-diagnosis">
          <FileText size={14} />
          <span>{diagnosis || 'No diagnosis recorded'}</span>
        </div>

        {/* Vitals Summary */}
        {vitals && Object.keys(vitals).length > 0 && (
          <div className="patient-vitals-summary">
            {vitals.hr && (
              <span className="vital-item">
                <Activity size={12} />
                {vitals.hr}
              </span>
            )}
            {vitals.bp && (
              <span className="vital-item">
                {vitals.bp}
              </span>
            )}
            {vitals.temp && (
              <span className={`vital-item ${vitals.temp > 38 ? 'abnormal' : ''}`}>
                {vitals.temp}°C
              </span>
            )}
            {vitals.spo2 && (
              <span className={`vital-item ${vitals.spo2 < 94 ? 'abnormal' : ''}`}>
                SpO₂ {vitals.spo2}%
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="patient-card-footer">
          <div className="patient-status-badge">
            <StatusBadge status={status} />
          </div>
          
          <div className="patient-updated">
            <Clock size={12} />
            <span>{formatTime(updatedAt)}</span>
          </div>

          {/* Quick Actions */}
          <div className="patient-quick-actions">
            <button
              className="quick-action-btn"
              onClick={(e) => handleQuickAction(e, 'labs')}
              title="View Labs"
            >
              <TestTube size={16} />
            </button>
            <button
              className="quick-action-btn"
              onClick={(e) => handleQuickAction(e, 'meds')}
              title="View Medications"
            >
              <Pill size={16} />
            </button>
            <button
              className="quick-action-btn"
              onClick={(e) => handleQuickAction(e, 'more')}
              title="More Options"
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alert Indicator */}
      {status === 'critical' && (
        <div className="patient-critical-indicator">
          <AlertTriangle size={16} />
        </div>
      )}
    </div>
  );
});

/**
 * PatientCardSkeleton
 * Loading state placeholder
 */
export function PatientCardSkeleton() {
  return (
    <div className="patient-card skeleton">
      <div className="skeleton-line skeleton-name" />
      <div className="skeleton-line skeleton-meta" />
      <div className="skeleton-line skeleton-diagnosis" />
      <div className="skeleton-footer">
        <div className="skeleton-badge" />
        <div className="skeleton-time" />
      </div>
    </div>
  );
}

/**
 * PatientMiniCard
 * Minimal card for dashboard/sidebar display
 */
export function PatientMiniCard({ patient, onClick }) {
  const { name, bed, status, diagnosis } = patient;
  
  return (
    <div 
      className={`patient-mini-card status-${status}`}
      onClick={() => onClick?.(patient)}
    >
      <span className={`mini-status-dot status-${status}`} />
      <div className="mini-info">
        <span className="mini-name">{name}</span>
        <span className="mini-meta">{bed} • {diagnosis}</span>
      </div>
    </div>
  );
}

export default PatientCard;

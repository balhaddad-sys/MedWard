import { useState } from 'react';
import { 
  User, 
  FileText, 
  Activity, 
  TestTube, 
  Pill, 
  ClipboardList,
  MessageSquare,
  History,
  Edit,
  Trash2,
  Share2,
  Printer,
  MoreVertical,
  AlertTriangle,
  Clock,
  MapPin
} from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import { IconButton } from '../ui/Button';
import { PATIENT_STATUS, WARDS } from '../../config/constants';

/**
 * PatientDetail Component
 * Full patient view with tabbed sections
 * 
 * @param {object} patient - Patient data object
 * @param {function} onEdit - Edit handler
 * @param {function} onDelete - Delete handler
 * @param {function} onShare - Share/handover handler
 * @param {function} onClose - Close handler
 * @param {boolean} loading - Loading state
 */
export function PatientDetail({
  patient,
  onEdit,
  onDelete,
  onShare,
  onClose,
  loading = false,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showActions, setShowActions] = useState(false);

  if (!patient) return null;

  const {
    name,
    fileNumber,
    age,
    sex,
    ward,
    bed,
    diagnosis,
    status = 'stable',
    vitals = {},
    labs = [],
    medications = [],
    plan = [],
    notes,
    admissionDate,
    updatedAt,
  } = patient;

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={18} /> },
    { id: 'vitals', label: 'Vitals', icon: <Activity size={18} /> },
    { id: 'labs', label: 'Labs', icon: <TestTube size={18} />, count: labs.length },
    { id: 'meds', label: 'Meds', icon: <Pill size={18} />, count: medications.length },
    { id: 'plan', label: 'Plan', icon: <ClipboardList size={18} />, count: plan.length },
    { id: 'notes', label: 'Notes', icon: <MessageSquare size={18} /> },
  ];

  return (
    <div className={`patient-detail status-${status}`}>
      {/* Header */}
      <header className="patient-detail-header">
        <div className="patient-detail-identity">
          <div className="patient-avatar">
            <span>{name?.charAt(0) || '?'}</span>
          </div>
          <div className="patient-info">
            <h1 className="patient-name">{name}</h1>
            <div className="patient-meta">
              <span>{age}y / {sex}</span>
              <span>#{fileNumber}</span>
            </div>
          </div>
        </div>

        <div className="patient-detail-status">
          <StatusBadge status={status} size="lg" />
          {status === 'critical' && (
            <div className="critical-alert">
              <AlertTriangle size={16} />
              <span>Critical</span>
            </div>
          )}
        </div>

        <div className="patient-detail-actions">
          <IconButton
            onClick={onEdit}
            label="Edit patient"
            variant="default"
          >
            <Edit size={20} />
          </IconButton>
          
          <IconButton
            onClick={onShare}
            label="Share/Handover"
            variant="default"
          >
            <Share2 size={20} />
          </IconButton>

          <div className="actions-dropdown">
            <IconButton
              onClick={() => setShowActions(!showActions)}
              label="More actions"
              variant="default"
            >
              <MoreVertical size={20} />
            </IconButton>

            {showActions && (
              <div className="dropdown-menu">
                <button onClick={() => window.print()}>
                  <Printer size={16} />
                  Print Summary
                </button>
                <button onClick={() => {}}>
                  <History size={16} />
                  View History
                </button>
                <button 
                  onClick={onDelete}
                  className="danger"
                >
                  <Trash2 size={16} />
                  Discharge Patient
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Location Bar */}
      <div className="patient-location-bar">
        <div className="location-item">
          <MapPin size={14} />
          <span>{WARDS[ward]?.name || ward}</span>
        </div>
        <div className="location-item">
          <span>Bed {bed}</span>
        </div>
        <div className="location-item">
          <Clock size={14} />
          <span>Admitted {formatDate(admissionDate)}</span>
        </div>
        <div className="location-item">
          <span>Updated {formatTime(updatedAt)}</span>
        </div>
      </div>

      {/* Tabs */}
      <nav className="patient-detail-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="patient-detail-content">
        {activeTab === 'overview' && (
          <OverviewTab patient={patient} />
        )}

        {activeTab === 'vitals' && (
          <VitalsTab vitals={vitals} />
        )}

        {activeTab === 'labs' && (
          <LabsTab labs={labs} />
        )}

        {activeTab === 'meds' && (
          <MedsTab medications={medications} />
        )}

        {activeTab === 'plan' && (
          <PlanTab plan={plan} />
        )}

        {activeTab === 'notes' && (
          <NotesTab notes={notes} />
        )}
      </div>
    </div>
  );
}

// Tab Components
function OverviewTab({ patient }) {
  const { diagnosis, vitals = {}, labs = [], medications = [] } = patient;

  return (
    <div className="overview-tab">
      <section className="overview-section">
        <h3>Diagnosis</h3>
        <p className="diagnosis-text">{diagnosis || 'No diagnosis recorded'}</p>
      </section>

      {vitals && Object.keys(vitals).length > 0 && (
        <section className="overview-section">
          <h3>Current Vitals</h3>
          <div className="vitals-mini-grid">
            {vitals.hr && <VitalMini label="HR" value={vitals.hr} unit="bpm" />}
            {vitals.bp && <VitalMini label="BP" value={vitals.bp} />}
            {vitals.temp && <VitalMini label="Temp" value={vitals.temp} unit="°C" />}
            {vitals.rr && <VitalMini label="RR" value={vitals.rr} unit="/min" />}
            {vitals.spo2 && <VitalMini label="SpO₂" value={vitals.spo2} unit="%" />}
          </div>
        </section>
      )}

      {labs.length > 0 && (
        <section className="overview-section">
          <h3>Recent Labs</h3>
          <p className="overview-count">{labs.length} lab result(s) on file</p>
        </section>
      )}

      {medications.length > 0 && (
        <section className="overview-section">
          <h3>Active Medications</h3>
          <p className="overview-count">{medications.length} medication(s)</p>
        </section>
      )}
    </div>
  );
}

function VitalMini({ label, value, unit = '' }) {
  return (
    <div className="vital-mini">
      <span className="vital-label">{label}</span>
      <span className="vital-value">{value}{unit}</span>
    </div>
  );
}

function VitalsTab({ vitals }) {
  if (!vitals || Object.keys(vitals).length === 0) {
    return (
      <div className="empty-tab">
        <Activity size={48} strokeWidth={1.5} />
        <p>No vitals recorded</p>
      </div>
    );
  }

  return (
    <div className="vitals-tab">
      <div className="vitals-grid">
        <VitalCard label="Heart Rate" value={vitals.hr} unit="bpm" icon={<Activity size={24} />} />
        <VitalCard label="Blood Pressure" value={vitals.bp} icon={<Activity size={24} />} />
        <VitalCard label="Temperature" value={vitals.temp} unit="°C" icon={<Activity size={24} />} />
        <VitalCard label="Respiratory Rate" value={vitals.rr} unit="/min" icon={<Activity size={24} />} />
        <VitalCard label="SpO₂" value={vitals.spo2} unit="%" icon={<Activity size={24} />} />
      </div>
    </div>
  );
}

function VitalCard({ label, value, unit = '', icon }) {
  return (
    <div className="vital-card">
      <div className="vital-icon">{icon}</div>
      <div className="vital-info">
        <span className="vital-label">{label}</span>
        <span className="vital-value">
          {value ?? 'N/A'}{value && unit}
        </span>
      </div>
    </div>
  );
}

function LabsTab({ labs }) {
  if (!labs || labs.length === 0) {
    return (
      <div className="empty-tab">
        <TestTube size={48} strokeWidth={1.5} />
        <p>No lab results</p>
      </div>
    );
  }

  return (
    <div className="labs-tab">
      {labs.map((lab, index) => (
        <div key={index} className="lab-entry">
          <div className="lab-header">
            <span className="lab-date">{lab.timestamp || 'Unknown date'}</span>
          </div>
          <pre className="lab-values">{JSON.stringify(lab, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}

function MedsTab({ medications }) {
  if (!medications || medications.length === 0) {
    return (
      <div className="empty-tab">
        <Pill size={48} strokeWidth={1.5} />
        <p>No medications</p>
      </div>
    );
  }

  return (
    <div className="meds-tab">
      {medications.map((med, index) => (
        <div key={index} className="med-card">
          <div className="med-name">{med.name || 'Unknown'}</div>
          <div className="med-dose">{med.dose} {med.route} {med.frequency}</div>
          <div className="med-status">{med.status || 'active'}</div>
        </div>
      ))}
    </div>
  );
}

function PlanTab({ plan }) {
  if (!plan || plan.length === 0) {
    return (
      <div className="empty-tab">
        <ClipboardList size={48} strokeWidth={1.5} />
        <p>No plan items</p>
      </div>
    );
  }

  return (
    <div className="plan-tab">
      {plan.map((item, index) => (
        <div key={index} className={`plan-item ${item.completed ? 'completed' : ''}`}>
          <input 
            type="checkbox" 
            checked={item.completed} 
            readOnly 
          />
          <span>{item.text || item}</span>
        </div>
      ))}
    </div>
  );
}

function NotesTab({ notes }) {
  if (!notes) {
    return (
      <div className="empty-tab">
        <MessageSquare size={48} strokeWidth={1.5} />
        <p>No notes</p>
      </div>
    );
  }

  return (
    <div className="notes-tab">
      <div className="notes-content">
        {notes}
      </div>
    </div>
  );
}

export default PatientDetail;

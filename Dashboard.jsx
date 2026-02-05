import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  Clock,
  Activity,
  Brain,
  Pill,
  TestTube,
  FileText,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { StatCard, SectionCard, WardSection } from '../components/ui/Card';
import { PatientMiniCard } from '../components/patients/PatientCard';
import Spinner from '../components/ui/Spinner';
import { usePatients } from '../hooks/usePatients';
import { useAuthContext } from '../context/AuthContext';
import { WARDS, AI_FEATURES } from '../config/constants';

/**
 * Dashboard Page
 * Main overview with stats, alerts, and quick actions
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  
  const {
    patients,
    loading,
    stats,
    criticalPatients,
    guardedPatients,
    refresh,
    refreshStats,
  } = usePatients(null, true);

  const [greeting, setGreeting] = useState('');

  // Set greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Format date
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Quick action handlers
  const handleQuickAction = (action) => {
    switch (action) {
      case 'askClinical':
        navigate('/ai?feature=clinical');
        break;
      case 'drugLookup':
        navigate('/ai?feature=drug');
        break;
      case 'labAnalysis':
        navigate('/ai?feature=lab');
        break;
      case 'references':
        navigate('/references');
        break;
      default:
        break;
    }
  };

  if (loading && patients.length === 0) {
    return (
      <PageContainer>
        <div className="loading-center">
          <Spinner size="lg" />
          <p>Loading dashboard...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Dashboard"
      subtitle={today}
      actions={
        <button 
          className="btn btn-ghost btn-sm"
          onClick={() => { refresh(); refreshStats(); }}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      {/* Greeting */}
      <section className="dashboard-greeting">
        <h2>{greeting}, {user?.displayName?.split(' ')[0] || 'Doctor'}</h2>
        <p>Here's your ward overview</p>
      </section>

      {/* Stats Grid */}
      <section className="dashboard-stats">
        <StatCard
          label="Total Patients"
          value={stats?.total || patients.length}
          icon={<Users size={24} />}
          color="primary"
          onClick={() => navigate('/patients')}
        />
        <StatCard
          label="Critical"
          value={stats?.critical || criticalPatients.length}
          icon={<AlertTriangle size={24} />}
          color="danger"
          onClick={() => navigate('/patients?status=critical')}
        />
        <StatCard
          label="Guarded"
          value={stats?.guarded || guardedPatients.length}
          icon={<AlertCircle size={24} />}
          color="warning"
          onClick={() => navigate('/patients?status=guarded')}
        />
        <StatCard
          label="Stable"
          value={stats?.stable || patients.filter(p => p.status === 'stable').length}
          icon={<CheckCircle size={24} />}
          color="success"
          onClick={() => navigate('/patients?status=stable')}
        />
      </section>

      {/* Critical Patients Alert */}
      {criticalPatients.length > 0 && (
        <SectionCard
          title="Critical Patients"
          icon={<AlertTriangle size={20} />}
          variant="danger"
          action={
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/patients?status=critical')}
            >
              View All
              <ChevronRight size={16} />
            </button>
          }
        >
          <div className="critical-patients-list">
            {criticalPatients.slice(0, 5).map(patient => (
              <PatientMiniCard
                key={patient.id}
                patient={patient}
                onClick={() => navigate(`/patient/${patient.id}`)}
              />
            ))}
            {criticalPatients.length > 5 && (
              <p className="more-count">
                +{criticalPatients.length - 5} more critical patients
              </p>
            )}
          </div>
        </SectionCard>
      )}

      {/* Quick Actions */}
      <SectionCard
        title="AI Assistant"
        icon={<Brain size={20} />}
        subtitle="Clinical decision support"
      >
        <div className="quick-actions-grid">
          <button 
            className="quick-action-card"
            onClick={() => handleQuickAction('askClinical')}
          >
            <div className="quick-action-icon">
              <Activity size={24} />
            </div>
            <span>Ask Clinical</span>
          </button>
          
          <button 
            className="quick-action-card"
            onClick={() => handleQuickAction('drugLookup')}
          >
            <div className="quick-action-icon">
              <Pill size={24} />
            </div>
            <span>Drug Info</span>
          </button>
          
          <button 
            className="quick-action-card"
            onClick={() => handleQuickAction('labAnalysis')}
          >
            <div className="quick-action-icon">
              <TestTube size={24} />
            </div>
            <span>Lab Analysis</span>
          </button>
          
          <button 
            className="quick-action-card"
            onClick={() => handleQuickAction('references')}
          >
            <div className="quick-action-icon">
              <FileText size={24} />
            </div>
            <span>References</span>
          </button>
        </div>
      </SectionCard>

      {/* Ward Overview */}
      <SectionCard
        title="Ward Overview"
        icon={<Users size={20} />}
        action={
          <button 
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/patients')}
          >
            View All
            <ChevronRight size={16} />
          </button>
        }
      >
        <div className="ward-overview-grid">
          {Object.entries(WARDS).map(([key, ward]) => {
            const wardPatients = patients.filter(p => p.ward === key);
            const criticalCount = wardPatients.filter(p => p.status === 'critical').length;
            
            return (
              <WardSection
                key={key}
                name={ward.name}
                shortName={ward.shortName}
                patientCount={wardPatients.length}
                criticalCount={criticalCount}
                onClick={() => navigate(`/patients?ward=${key}`)}
              />
            );
          })}
        </div>
      </SectionCard>

      {/* Recent Activity */}
      <SectionCard
        title="Recently Updated"
        icon={<Clock size={20} />}
        subtitle="Last 24 hours"
      >
        <div className="recent-patients-list">
          {patients
            .sort((a, b) => {
              const dateA = a.updatedAt?.toDate?.() || new Date(a.updatedAt) || new Date(0);
              const dateB = b.updatedAt?.toDate?.() || new Date(b.updatedAt) || new Date(0);
              return dateB - dateA;
            })
            .slice(0, 5)
            .map(patient => (
              <PatientMiniCard
                key={patient.id}
                patient={patient}
                onClick={() => navigate(`/patient/${patient.id}`)}
              />
            ))
          }
          
          {patients.length === 0 && (
            <p className="empty-message">No patients yet</p>
          )}
        </div>
      </SectionCard>

      {/* Stats Summary */}
      {stats?.newToday > 0 && (
        <div className="stats-banner">
          <TrendingUp size={18} />
          <span>{stats.newToday} new admission{stats.newToday !== 1 ? 's' : ''} today</span>
        </div>
      )}
    </PageContainer>
  );
}

export default DashboardPage;

import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import { PatientList } from '../components/patients/PatientList';
import { PatientForm } from '../components/patients/PatientForm';
import { PatientDetail } from '../components/patients/PatientDetail';
import Modal, { ConfirmDialog } from '../components/ui/Modal';
import { FAB } from '../components/ui/Button';
import { usePatients } from '../hooks/usePatients';
import { useToast } from '../hooks/useToast';

/**
 * Patients Page
 * Main patient management interface
 */
export function PatientsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success, error: showError } = useToast();

  // Get ward filter from URL
  const wardFilter = searchParams.get('ward');

  // Patient data hook
  const {
    patients,
    loading,
    error,
    addPatient,
    updatePatient,
    deletePatient,
    refresh,
  } = usePatients(wardFilter);

  // UI State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Handle patient click
  const handlePatientClick = useCallback((patient) => {
    setSelectedPatient(patient);
    setShowDetailModal(true);
  }, []);

  // Handle quick actions
  const handleQuickAction = useCallback((action, patient) => {
    switch (action) {
      case 'labs':
        // Navigate to labs view or open labs modal
        navigate(`/patient/${patient.id}?tab=labs`);
        break;
      case 'meds':
        navigate(`/patient/${patient.id}?tab=meds`);
        break;
      case 'more':
        setSelectedPatient(patient);
        setShowDetailModal(true);
        break;
      default:
        break;
    }
  }, [navigate]);

  // Handle add patient
  const handleAddPatient = useCallback(async (patientData) => {
    setFormLoading(true);
    
    const result = await addPatient(patientData);
    
    if (result.success) {
      success('Patient added successfully');
      setShowAddModal(false);
    } else {
      showError(result.error || 'Failed to add patient');
    }
    
    setFormLoading(false);
  }, [addPatient, success, showError]);

  // Handle edit patient
  const handleEditPatient = useCallback(async (patientData) => {
    if (!selectedPatient?.id) return;
    
    setFormLoading(true);
    
    const result = await updatePatient(selectedPatient.id, patientData);
    
    if (result.success) {
      success('Patient updated successfully');
      setShowEditModal(false);
      setSelectedPatient(null);
    } else {
      showError(result.error || 'Failed to update patient');
    }
    
    setFormLoading(false);
  }, [selectedPatient, updatePatient, success, showError]);

  // Handle delete patient
  const handleDeletePatient = useCallback(async () => {
    if (!selectedPatient?.id) return;
    
    const result = await deletePatient(selectedPatient.id);
    
    if (result.success) {
      success('Patient discharged successfully');
      setShowDeleteConfirm(false);
      setShowDetailModal(false);
      setSelectedPatient(null);
    } else {
      showError(result.error || 'Failed to discharge patient');
    }
  }, [selectedPatient, deletePatient, success, showError]);

  // Handle share/handover
  const handleShare = useCallback(() => {
    if (!selectedPatient) return;
    // Navigate to handover or open share dialog
    navigate(`/handover/${selectedPatient.id}`);
  }, [selectedPatient, navigate]);

  // Handle ward filter change
  const handleWardChange = useCallback((ward) => {
    if (ward) {
      setSearchParams({ ward });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);

  return (
    <PageContainer
      title="Patients"
      actions={
        <button 
          className="btn btn-ghost btn-sm"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={refresh}>Retry</button>
        </div>
      )}

      {/* Patient List */}
      <PatientList
        patients={patients}
        loading={loading}
        onPatientClick={handlePatientClick}
        onQuickAction={handleQuickAction}
        defaultWard={wardFilter}
        showFilters={true}
      />

      {/* Add Patient FAB */}
      <FAB
        onClick={() => setShowAddModal(true)}
        label="Add Patient"
        position="bottom-right"
      >
        <Plus size={24} />
      </FAB>

      {/* Add Patient Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Patient"
        size="wide"
      >
        <PatientForm
          onSubmit={handleAddPatient}
          onCancel={() => setShowAddModal(false)}
          loading={formLoading}
        />
      </Modal>

      {/* Edit Patient Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Patient"
        size="wide"
      >
        <PatientForm
          patient={selectedPatient}
          onSubmit={handleEditPatient}
          onCancel={() => setShowEditModal(false)}
          loading={formLoading}
        />
      </Modal>

      {/* Patient Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPatient(null);
        }}
        size="fullscreen"
      >
        <PatientDetail
          patient={selectedPatient}
          onEdit={() => {
            setShowDetailModal(false);
            setShowEditModal(true);
          }}
          onDelete={() => setShowDeleteConfirm(true)}
          onShare={handleShare}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedPatient(null);
          }}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeletePatient}
        title="Discharge Patient"
        message={`Are you sure you want to discharge ${selectedPatient?.name}? This action cannot be undone.`}
        confirmLabel="Discharge"
        confirmVariant="danger"
      />
    </PageContainer>
  );
}

export default PatientsPage;

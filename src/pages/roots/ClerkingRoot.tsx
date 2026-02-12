import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  FileText,
  Stethoscope,
  FlaskConical,
  ListChecks,
  ClipboardList,
  Shield,
  Send,
  Plus,
  AlertCircle,
  Trash2,
  Copy,
  AlertTriangle,
  Pill,
  Heart,
  UserPlus,
  X,
  Save,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { debounce } from '@/utils/uiEffects';
import { createPatient } from '@/services/firebase/patients';
import {
  createClerkingNote,
  updateClerkingNote,
  saveClerkingToOnCall,
  generateSBAR,
} from '@/services/firebase/clerkingNotes';
import type {
  ClerkingNote,
  SectionStatus,
  Medication,
  Allergy,
  ConsultRequest,
  ProblemListItem,
} from '@/types/clerking';

const LOCALSTORAGE_DRAFT_KEY = 'clerking_draft_v2';
const AUTOSAVE_INTERVAL = 3000; // 3 seconds

export default function ClerkingRoot() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const patients = usePatientStore((s) => s.patients);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [clerkingNote, setClerkingNote] = useState<Partial<ClerkingNote> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentSection, setCurrentSection] = useState<string>('overview');

  // New patient dialog
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'M' as 'M' | 'F' | 'Other',
    mrn: '',
    bedNumber: '',
  });

  const autosaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadDraftFromLocalStorage();
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!clerkingNote || !activeNoteId) return;

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Set new timer
    autosaveTimerRef.current = setTimeout(() => {
      handleAutoSave();
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [clerkingNote, activeNoteId]);

  function loadDraftFromLocalStorage() {
    try {
      const draftJson = localStorage.getItem(LOCALSTORAGE_DRAFT_KEY);
      if (draftJson) {
        const draft = JSON.parse(draftJson);
        setClerkingNote(draft.note);
        setActiveNoteId(draft.noteId);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }

  function saveDraftToLocalStorage() {
    if (!clerkingNote || !activeNoteId) return;
    try {
      const draft = { note: clerkingNote, noteId: activeNoteId };
      localStorage.setItem(LOCALSTORAGE_DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }

  async function handleAutoSave() {
    if (!activeNoteId || !clerkingNote) return;

    try {
      await updateClerkingNote(activeNoteId, clerkingNote);
      setLastSaved(new Date());
      saveDraftToLocalStorage();
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }

  async function handleStartClerking() {
    if (!user) {
      alert('You must be logged in');
      return;
    }

    setIsSaving(true);

    try {
      const noteId = await createClerkingNote(
        user.id,
        user.displayName,
        'unassigned', // Start without patient
        {
          location: '',
          workingDiagnosis: 'Assessment pending',
          presentingComplaint: '',
          diagnosisKeywords: [],
        }
      );

      const newNote: Partial<ClerkingNote> = {
        id: noteId,
        patientId: 'unassigned',
        authorId: user.id,
        authorName: user.displayName,
        status: 'draft',
        location: '',
        workingDiagnosis: 'Assessment pending',
        diagnosisKeywords: [],
        presentingComplaint: '',
        history: {},
        examination: {},
        investigations: {},
        problemList: [],
        plan: {},
        safety: {},
        sectionStatus: {
          history: 'incomplete',
          examination: 'incomplete',
          investigations: 'incomplete',
          assessment: 'incomplete',
          plan: 'incomplete',
          safety: 'incomplete',
        },
        completionPercentage: 0,
      };

      setClerkingNote(newNote);
      setActiveNoteId(noteId);
      saveDraftToLocalStorage();
    } catch (error) {
      console.error('Failed to start clerking:', error);
      alert('Failed to start clerking. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateNewPatient() {
    if (!newPatientData.firstName || !newPatientData.lastName) {
      alert('First name and last name are required');
      return;
    }

    if (!user) {
      alert('You must be logged in');
      return;
    }

    setIsSaving(true);

    try {
      const patientId = await createPatient({
        ...newPatientData,
        wardId: user.wardIds?.[0] || 'default-ward',
        admissionDate: new Date(),
        status: 'active' as const,
        assignedDoctorId: user.id,
        assignedNurseId: '',
        allergies: [],
        medications: [],
        notes: '',
        acuity: 3,
        primaryDiagnosis: '',
        diagnoses: [],
        codeStatus: 'full' as const,
        attendingPhysician: '',
        team: '',
      } as any, user.id);

      // Link patient to clerking note
      updateClerkingData({ patientId });
      setShowNewPatientDialog(false);
      setNewPatientData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'M',
        mrn: '',
        bedNumber: '',
      });
      alert('✅ Patient created and linked!');
    } catch (error) {
      console.error('Failed to create patient:', error);
      alert('Failed to create patient. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveToOnCall() {
    if (!activeNoteId) {
      alert('No active clerking note.');
      return;
    }

    if (!user) {
      alert('You must be logged in.');
      return;
    }

    // Validate that we have minimum required data
    if (!clerkingNote?.workingDiagnosis || clerkingNote.workingDiagnosis === 'Assessment pending') {
      alert('Please add a working diagnosis before saving to On-Call.');
      return;
    }

    const confirmed = window.confirm(
      'Add this patient to On-Call list?\n\nThey will appear in On-Call Mode for quick follow-up & overnight tasks.'
    );

    if (!confirmed) return;

    setIsSaving(true);

    try {
      console.log('Saving to On-Call:', { activeNoteId, userId: user.id, diagnosis: clerkingNote.workingDiagnosis });
      const result = await saveClerkingToOnCall(activeNoteId, user.id);
      console.log('Result:', result);

      if (result.success) {
        alert('✅ Patient added to On-Call list!');
        localStorage.removeItem(LOCALSTORAGE_DRAFT_KEY);
        setClerkingNote(null);
        setActiveNoteId(null);
      } else {
        alert(`❌ Failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Save to On-Call failed:', error);
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }

  function updateClerkingData(updates: Partial<ClerkingNote>) {
    setClerkingNote((prev) => ({ ...prev, ...updates }));
  }

  function handleDiscard() {
    const confirmed = window.confirm('Discard this clerking note? All unsaved data will be lost.');
    if (!confirmed) return;

    localStorage.removeItem(LOCALSTORAGE_DRAFT_KEY);
    setClerkingNote(null);
    setActiveNoteId(null);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: LANDING (no active clerking)
  // ═══════════════════════════════════════════════════════════════════════════

  if (!clerkingNote || !activeNoteId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <Stethoscope className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Clerking Mode</h1>
            <p className="text-slate-600">
              Structured patient admission & clerking workflow
            </p>
          </div>

          <div className="card p-8 text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">Start a New Clerking</h2>
              <p className="text-sm text-slate-600">
                Document patient history, examination, investigations, and create a management plan
              </p>
            </div>

            <button
              onClick={handleStartClerking}
              disabled={isSaving}
              className={clsx(
                'w-full btn-primary py-4 text-lg font-semibold flex items-center justify-center gap-3',
                isSaving && 'loading-pulse'
              )}
            >
              <Plus className="w-6 h-6" />
              {isSaving ? 'Starting...' : 'Start Clerking'}
            </button>

            <div className="grid grid-cols-2 gap-4 pt-4 text-left">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Structured</p>
                  <p className="text-xs text-slate-600">Guided sections</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Save className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Auto-save</p>
                  <p className="text-xs text-slate-600">Never lose work</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Send className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">On-Call</p>
                  <p className="text-xs text-slate-600">Quick handover</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">SBAR</p>
                  <p className="text-xs text-slate-600">Auto-generate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: CLERKING COCKPIT (active clerking)
  // ═══════════════════════════════════════════════════════════════════════════

  const selectedPatient = patients.find((p) => p.id === clerkingNote.patientId);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-semibold text-slate-900">Clerking</h1>
              </div>

              {lastSaved && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  Saved {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDiscard}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Discard
              </button>
              <button
                onClick={handleSaveToOnCall}
                disabled={isSaving}
                className={clsx(
                  'btn-primary text-sm px-4 py-1.5 flex items-center gap-2',
                  isSaving && 'loading-pulse'
                )}
              >
                <Send className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save to On-Call'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Patient Info & Navigation */}
          <div className="lg:col-span-1 space-y-4">
            {/* Patient Card */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Patient</h3>
                <button
                  onClick={() => setShowNewPatientDialog(true)}
                  className="text-blue-600 hover:text-blue-700 text-xs"
                >
                  {clerkingNote.patientId === 'unassigned' ? 'Add' : 'Change'}
                </button>
              </div>

              {clerkingNote.patientId === 'unassigned' ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-3">No patient assigned</p>
                  <button
                    onClick={() => setShowNewPatientDialog(true)}
                    className="btn-secondary text-xs flex items-center gap-1.5 mx-auto"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Patient
                  </button>
                </div>
              ) : selectedPatient ? (
                <div>
                  <p className="font-medium text-slate-900">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-xs text-slate-600">MRN: {selectedPatient.mrn}</p>
                  <p className="text-xs text-slate-600">Bed: {selectedPatient.bedNumber}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">Patient not found</p>
              )}

              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={clerkingNote.location || ''}
                    onChange={(e) => updateClerkingData({ location: e.target.value })}
                    placeholder="ED Bed 12"
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Working Diagnosis
                  </label>
                  <input
                    type="text"
                    value={clerkingNote.workingDiagnosis || ''}
                    onChange={(e) => updateClerkingData({ workingDiagnosis: e.target.value })}
                    placeholder="e.g., Pneumonia"
                    className="input-field text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section Navigation */}
            <nav className="card p-2 space-y-1">
              <NavButton
                id="overview"
                label="Overview"
                icon={ClipboardList}
                active={currentSection === 'overview'}
                onClick={() => setCurrentSection('overview')}
              />
              <NavButton
                id="history"
                label="History"
                icon={FileText}
                active={currentSection === 'history'}
                onClick={() => setCurrentSection('history')}
                status={clerkingNote.sectionStatus?.history}
              />
              <NavButton
                id="examination"
                label="Examination"
                icon={Stethoscope}
                active={currentSection === 'examination'}
                onClick={() => setCurrentSection('examination')}
                status={clerkingNote.sectionStatus?.examination}
              />
              <NavButton
                id="investigations"
                label="Investigations"
                icon={FlaskConical}
                active={currentSection === 'investigations'}
                onClick={() => setCurrentSection('investigations')}
                status={clerkingNote.sectionStatus?.investigations}
              />
              <NavButton
                id="assessment"
                label="Assessment"
                icon={ListChecks}
                active={currentSection === 'assessment'}
                onClick={() => setCurrentSection('assessment')}
                status={clerkingNote.sectionStatus?.assessment}
              />
              <NavButton
                id="plan"
                label="Plan"
                icon={ClipboardList}
                active={currentSection === 'plan'}
                onClick={() => setCurrentSection('plan')}
                status={clerkingNote.sectionStatus?.plan}
              />
              <NavButton
                id="safety"
                label="Safety"
                icon={Shield}
                active={currentSection === 'safety'}
                onClick={() => setCurrentSection('safety')}
                status={clerkingNote.sectionStatus?.safety}
              />
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="card p-6">
              {currentSection === 'overview' && (
                <OverviewSection
                  clerkingNote={clerkingNote}
                  onUpdate={updateClerkingData}
                />
              )}
              {currentSection === 'history' && (
                <HistorySection
                  clerkingNote={clerkingNote}
                  onUpdate={updateClerkingData}
                />
              )}
              {currentSection === 'examination' && (
                <ExaminationSection
                  clerkingNote={clerkingNote}
                  onUpdate={updateClerkingData}
                />
              )}
              {currentSection === 'investigations' && (
                <InvestigationsSection
                  clerkingNote={clerkingNote}
                  onUpdate={updateClerkingData}
                />
              )}
              {currentSection === 'assessment' && (
                <AssessmentSection
                  clerkingNote={clerkingNote}
                  onUpdate={updateClerkingData}
                />
              )}
              {currentSection === 'plan' && (
                <PlanSection
                  clerkingNote={clerkingNote}
                  onUpdate={updateClerkingData}
                />
              )}
              {currentSection === 'safety' && (
                <SafetySection
                  clerkingNote={clerkingNote}
                  onUpdate={updateClerkingData}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Patient Dialog */}
      {showNewPatientDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {clerkingNote.patientId === 'unassigned' ? 'Add Patient' : 'Change Patient'}
              </h2>
              <button
                onClick={() => setShowNewPatientDialog(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Existing Patient
                </label>
                <select
                  value={clerkingNote.patientId === 'unassigned' ? '' : clerkingNote.patientId}
                  onChange={(e) => {
                    updateClerkingData({ patientId: e.target.value || 'unassigned' });
                    setShowNewPatientDialog(false);
                  }}
                  className="input-field"
                >
                  <option value="">Select a patient...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName} - {patient.mrn} - Bed {patient.bedNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-500">Or create new</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={newPatientData.firstName}
                    onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value })}
                    className="input-field"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={newPatientData.lastName}
                    onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value })}
                    className="input-field"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={newPatientData.dateOfBirth}
                  onChange={(e) => setNewPatientData({ ...newPatientData, dateOfBirth: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Gender
                </label>
                <select
                  value={newPatientData.gender}
                  onChange={(e) => setNewPatientData({ ...newPatientData, gender: e.target.value as any })}
                  className="input-field"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    MRN
                  </label>
                  <input
                    type="text"
                    value={newPatientData.mrn}
                    onChange={(e) => setNewPatientData({ ...newPatientData, mrn: e.target.value })}
                    className="input-field"
                    placeholder="123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bed Number
                  </label>
                  <input
                    type="text"
                    value={newPatientData.bedNumber}
                    onChange={(e) => setNewPatientData({ ...newPatientData, bedNumber: e.target.value })}
                    className="input-field"
                    placeholder="12A"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateNewPatient}
                disabled={isSaving || !newPatientData.firstName || !newPatientData.lastName}
                className={clsx('btn-primary w-full', isSaving && 'loading-pulse')}
              >
                {isSaving ? 'Creating...' : 'Create & Link Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION BUTTON
// ═══════════════════════════════════════════════════════════════════════════

function NavButton({
  id,
  label,
  icon: Icon,
  active,
  onClick,
  status,
}: {
  id: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  status?: SectionStatus;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-slate-700 hover:bg-slate-50'
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      {status && (
        <StatusBadge status={status} />
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: SectionStatus }) {
  if (status === 'complete') {
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  }
  if (status === 'warning') {
    return <div className="w-2 h-2 rounded-full bg-amber-500" />;
  }
  return <div className="w-2 h-2 rounded-full bg-slate-300" />;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function OverviewSection({
  clerkingNote,
  onUpdate,
}: {
  clerkingNote: Partial<ClerkingNote>;
  onUpdate: (updates: Partial<ClerkingNote>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Overview</h2>
        <p className="text-sm text-slate-600">Quick summary of presenting complaint and initial impression</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Presenting Complaint
        </label>
        <textarea
          value={clerkingNote.presentingComplaint || ''}
          onChange={(e) => onUpdate({ presentingComplaint: e.target.value })}
          placeholder="Chief complaint in patient's own words..."
          className="input-field"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Initial Impression / Working Diagnosis
        </label>
        <textarea
          value={clerkingNote.workingDiagnosis || ''}
          onChange={(e) => onUpdate({ workingDiagnosis: e.target.value })}
          placeholder="Your clinical impression..."
          className="input-field"
          rows={2}
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Quick Tip</h3>
        <p className="text-sm text-blue-800">
          Start with the overview, then work through History → Examination → Investigations → Assessment → Plan → Safety.
          All sections auto-save as you type.
        </p>
      </div>
    </div>
  );
}

function HistorySection({
  clerkingNote,
  onUpdate,
}: {
  clerkingNote: Partial<ClerkingNote>;
  onUpdate: (updates: Partial<ClerkingNote>) => void;
}) {
  const history = clerkingNote.history || {};
  const [newMed, setNewMed] = useState<Partial<Medication>>({ name: '', dose: '', frequency: '', route: 'PO' });
  const [newAllergy, setNewAllergy] = useState<Partial<Allergy>>({ substance: '', reaction: '', severity: 'mild', type: 'drug' });

  function addMedication() {
    if (!newMed.name?.trim()) return;
    const medications = [...(history.medications || []), newMed as Medication];
    onUpdate({ history: { ...history, medications } });
    setNewMed({ name: '', dose: '', frequency: '', route: 'PO' });
  }

  function addAllergy() {
    if (!newAllergy.substance?.trim()) return;
    const allergies = [...(history.allergies || []), newAllergy as Allergy];
    onUpdate({ history: { ...history, allergies } });
    setNewAllergy({ substance: '', reaction: '', severity: 'mild', type: 'drug' });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">History</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          History of Presenting Illness
        </label>
        <textarea
          value={history.historyOfPresentingIllness || ''}
          onChange={(e) => onUpdate({ history: { ...history, historyOfPresentingIllness: e.target.value } })}
          placeholder="SOCRATES / detailed history..."
          className="input-field"
          rows={6}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Past Medical History
        </label>
        <textarea
          value={history.pastMedicalHistory?.join('\n') || ''}
          onChange={(e) =>
            onUpdate({
              history: {
                ...history,
                pastMedicalHistory: e.target.value.split('\n').filter((s) => s.trim()),
              },
            })
          }
          placeholder="One condition per line..."
          className="input-field"
          rows={4}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Current Medications
          </label>
        </div>
        <div className="space-y-2 mb-3">
          {history.medications?.map((med, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <Pill className="w-4 h-4 text-slate-400" />
              <span className="text-sm flex-1">
                <strong>{med.name}</strong> {med.dose} {med.frequency} ({med.route})
              </span>
              <button
                onClick={() => {
                  const medications = history.medications?.filter((_, i) => i !== idx);
                  onUpdate({ history: { ...history, medications } });
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMed.name || ''}
            onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
            placeholder="Medication name"
            className="input-field flex-1"
          />
          <input
            type="text"
            value={newMed.dose || ''}
            onChange={(e) => setNewMed({ ...newMed, dose: e.target.value })}
            placeholder="Dose"
            className="input-field w-24"
          />
          <button onClick={addMedication} className="btn-secondary px-3">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Allergies
          </label>
        </div>
        <div className="space-y-2 mb-3">
          {history.allergies?.map((allergy, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm flex-1">
                <strong>{allergy.substance}</strong> → {allergy.reaction} ({allergy.severity})
              </span>
              <button
                onClick={() => {
                  const allergies = history.allergies?.filter((_, i) => i !== idx);
                  onUpdate({ history: { ...history, allergies } });
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newAllergy.substance || ''}
            onChange={(e) => setNewAllergy({ ...newAllergy, substance: e.target.value })}
            placeholder="Allergen"
            className="input-field flex-1"
          />
          <input
            type="text"
            value={newAllergy.reaction || ''}
            onChange={(e) => setNewAllergy({ ...newAllergy, reaction: e.target.value })}
            placeholder="Reaction"
            className="input-field flex-1"
          />
          <button onClick={addAllergy} className="btn-secondary px-3">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Social History
        </label>
        <textarea
          value={
            typeof history.socialHistory === 'string'
              ? history.socialHistory
              : history.socialHistory?.occupation || ''
          }
          onChange={(e) =>
            onUpdate({
              history: { ...history, socialHistory: { occupation: e.target.value } },
            })
          }
          placeholder="Smoking, alcohol, occupation, living situation..."
          className="input-field"
          rows={3}
        />
      </div>
    </div>
  );
}

function ExaminationSection({
  clerkingNote,
  onUpdate,
}: {
  clerkingNote: Partial<ClerkingNote>;
  onUpdate: (updates: Partial<ClerkingNote>) => void;
}) {
  const exam: any = clerkingNote.examination || {};
  const vitals: any = exam.vitals || {};

  function updateVitals(updates: any) {
    onUpdate({
      examination: {
        ...exam,
        vitals: { ...vitals, ...updates, timestamp: new Date() },
      } as any,
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Examination</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            HR (bpm)
          </label>
          <input
            type="number"
            value={vitals.heartRate || ''}
            onChange={(e) => updateVitals({ heartRate: Number(e.target.value) })}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            BP Systolic
          </label>
          <input
            type="number"
            value={vitals.bloodPressureSystolic || ''}
            onChange={(e) => updateVitals({ bloodPressureSystolic: Number(e.target.value) })}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            BP Diastolic
          </label>
          <input
            type="number"
            value={vitals.bloodPressureDiastolic || ''}
            onChange={(e) => updateVitals({ bloodPressureDiastolic: Number(e.target.value) })}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            RR (breaths/min)
          </label>
          <input
            type="number"
            value={vitals.respiratoryRate || ''}
            onChange={(e) => updateVitals({ respiratoryRate: Number(e.target.value) })}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Temp (°C)
          </label>
          <input
            type="number"
            step="0.1"
            value={vitals.temperature || ''}
            onChange={(e) => updateVitals({ temperature: Number(e.target.value) })}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            SpO2 (%)
          </label>
          <input
            type="number"
            value={vitals.oxygenSaturation || ''}
            onChange={(e) => updateVitals({ oxygenSaturation: Number(e.target.value) })}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          General Appearance
        </label>
        <textarea
          value={(exam.general?.appearance as string) || ''}
          onChange={(e) =>
            onUpdate({
              examination: {
                ...exam,
                general: { ...exam.general, appearance: e.target.value },
              } as any,
            })
          }
          placeholder="Alert, comfortable, distressed, etc..."
          className="input-field"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Systems Examination
        </label>
        <textarea
          value={(exam.systemsNote as string) || ''}
          onChange={(e) =>
            onUpdate({ examination: { ...exam, systemsNote: e.target.value } as any })
          }
          placeholder="CVS: , Resp: , Abdo: , Neuro: , MSK: ..."
          className="input-field"
          rows={8}
        />
      </div>
    </div>
  );
}

function InvestigationsSection({
  clerkingNote,
  onUpdate,
}: {
  clerkingNote: Partial<ClerkingNote>;
  onUpdate: (updates: Partial<ClerkingNote>) => void;
}) {
  const inv = clerkingNote.investigations || { labs: [], imaging: [], microbiology: [], pendingResults: [] };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Investigations</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Lab Results
        </label>
        <textarea
          value={inv.labs?.map((l) => `${l.panelName}: ${JSON.stringify(l.tests)}`).join('\n') || ''}
          placeholder="FBC: Hb 120, WCC 8.5..."
          className="input-field"
          rows={6}
          disabled
        />
        <p className="text-xs text-slate-500 mt-1">
          Lab results are automatically imported from the Labs feature
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Imaging
        </label>
        <textarea
          value={(inv.imaging as any)?.join?.('\n') || ''}
          onChange={(e) =>
            onUpdate({
              investigations: {
                ...inv,
                imaging: e.target.value.split('\n').filter((s) => s.trim()),
              } as any,
            })
          }
          placeholder="CXR: Clear lung fields..."
          className="input-field"
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Pending Results
        </label>
        <textarea
          value={inv.pendingResults?.join('\n') || ''}
          onChange={(e) =>
            onUpdate({
              investigations: {
                ...inv,
                pendingResults: e.target.value.split('\n').filter((s) => s.trim()),
              },
            })
          }
          placeholder="Blood cultures pending..."
          className="input-field"
          rows={3}
        />
      </div>
    </div>
  );
}

function AssessmentSection({
  clerkingNote,
  onUpdate,
}: {
  clerkingNote: Partial<ClerkingNote>;
  onUpdate: (updates: Partial<ClerkingNote>) => void;
}) {
  const problemList = clerkingNote.problemList || [];
  const [newProblem, setNewProblem] = useState({ title: '', evidence: '', severity: 'medium' as const });

  function addProblem() {
    if (!newProblem.title.trim()) return;
    const updated: ProblemListItem[] = [...problemList, {
      id: Date.now().toString(),
      title: newProblem.title,
      evidence: [newProblem.evidence],
      severity: newProblem.severity,
      plan: [],
      tasks: [],
      isActive: true,
    }];
    onUpdate({ problemList: updated });
    setNewProblem({ title: '', evidence: '', severity: 'medium' });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Assessment</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Problem List
        </label>
        <div className="space-y-2 mb-3">
          {problemList.map((problem, idx) => (
            <div key={problem.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      problem.severity === 'critical' && 'bg-red-100 text-red-700',
                      problem.severity === 'high' && 'bg-orange-100 text-orange-700',
                      problem.severity === 'medium' && 'bg-yellow-100 text-yellow-700',
                      problem.severity === 'low' && 'bg-green-100 text-green-700'
                    )}>
                      {problem.severity}
                    </span>
                    <strong className="text-sm text-slate-900">{problem.title}</strong>
                  </div>
                  {problem.evidence && problem.evidence.length > 0 && (
                    <p className="text-xs text-slate-600">{problem.evidence.join(', ')}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    const updated = problemList.filter((_, i) => i !== idx);
                    onUpdate({ problemList: updated });
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={newProblem.title}
            onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })}
            placeholder="Problem / Diagnosis"
            className="input-field"
          />
          <div className="flex gap-2">
            <select
              value={newProblem.severity}
              onChange={(e) => setNewProblem({ ...newProblem, severity: e.target.value as any })}
              className="input-field w-32"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button onClick={addProblem} className="btn-primary px-4 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Problem
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Clinical Reasoning / Summary
        </label>
        <textarea
          value={clerkingNote.workingDiagnosis || ''}
          onChange={(e) => onUpdate({ workingDiagnosis: e.target.value })}
          placeholder="Your clinical impression and reasoning..."
          className="input-field"
          rows={5}
        />
      </div>
    </div>
  );
}

function PlanSection({
  clerkingNote,
  onUpdate,
}: {
  clerkingNote: Partial<ClerkingNote>;
  onUpdate: (updates: Partial<ClerkingNote>) => void;
}) {
  const plan: any = clerkingNote.plan || {};
  const [newConsult, setNewConsult] = useState<Partial<ConsultRequest>>({ specialty: '', reason: '', status: 'pending' });

  function addConsult() {
    if (!newConsult.specialty?.trim()) return;
    const consults = [...(plan.consults || []), newConsult as ConsultRequest];
    onUpdate({ plan: { ...plan, consults } as any });
    setNewConsult({ specialty: '', reason: '', status: 'pending' });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Plan</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Management Plan
        </label>
        <textarea
          value={plan.managementPlan || ''}
          onChange={(e) => onUpdate({ plan: { ...plan, managementPlan: e.target.value } as any })}
          placeholder="Treatment plan, medications, interventions..."
          className="input-field"
          rows={6}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Consultations
        </label>
        <div className="space-y-2 mb-3">
          {plan.consults?.map((consult: ConsultRequest, idx: number) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <span className="text-sm flex-1">
                <strong>{consult.specialty}</strong> - {consult.reason}
              </span>
              <button
                onClick={() => {
                  const consults = plan.consults?.filter((_: any, i: number) => i !== idx);
                  onUpdate({ plan: { ...plan, consults } as any });
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newConsult.specialty || ''}
            onChange={(e) => setNewConsult({ ...newConsult, specialty: e.target.value })}
            placeholder="Specialty"
            className="input-field flex-1"
          />
          <input
            type="text"
            value={newConsult.reason || ''}
            onChange={(e) => setNewConsult({ ...newConsult, reason: e.target.value })}
            placeholder="Reason"
            className="input-field flex-1"
          />
          <button onClick={addConsult} className="btn-secondary px-3">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Disposition
        </label>
        <input
          type="text"
          value={plan.disposition || ''}
          onChange={(e) => onUpdate({ plan: { ...plan, disposition: e.target.value } as any })}
          placeholder="Admit to ward / Discharge / Observation..."
          className="input-field"
        />
      </div>
    </div>
  );
}

function SafetySection({
  clerkingNote,
  onUpdate,
}: {
  clerkingNote: Partial<ClerkingNote>;
  onUpdate: (updates: Partial<ClerkingNote>) => void;
}) {
  const safety: any = clerkingNote.safety || {};

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Safety Checklist</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Code Status
        </label>
        <select
          value={safety.codeStatus || ''}
          onChange={(e) => onUpdate({ safety: { ...safety, codeStatus: e.target.value } as any })}
          className="input-field"
        >
          <option value="">Select...</option>
          <option value="Full Code">Full Code</option>
          <option value="DNR">DNR</option>
          <option value="DNI">DNI</option>
          <option value="Comfort Care">Comfort Care</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          VTE Prophylaxis
        </label>
        <textarea
          value={safety.vteProph?.reason || ''}
          onChange={(e) =>
            onUpdate({
              safety: {
                ...safety,
                vteProph: { considered: true, reason: e.target.value },
              } as any,
            })
          }
          placeholder="Enoxaparin 40mg SC daily / TEDs..."
          className="input-field"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Red Flags / Escalation Triggers
        </label>
        <textarea
          value={safety.escalationTriggers?.join?.('\n') || safety.other?.join?.('\n') || ''}
          onChange={(e) =>
            onUpdate({
              safety: {
                ...safety,
                other: e.target.value.split('\n').filter((s) => s.trim()),
              } as any,
            })
          }
          placeholder="When to escalate (one per line)..."
          className="input-field"
          rows={4}
        />
      </div>
    </div>
  );
}

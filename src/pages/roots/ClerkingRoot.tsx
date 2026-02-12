/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLERKING MODE - Type-Safe Implementation
 * Premium structured clinical clerking workflow
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  FileText,
  User,
  Activity,
  Stethoscope,
  FlaskConical,
  ListChecks,
  Shield,
  Save,
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
  ClerkingDraft,
  Medication,
  Allergy,
  ProblemListItem,
  ConsultRequest,
} from '@/types/clerking';
import { matchTemplate } from '@/types/clerking';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

type ClerkingScreen = 'entry' | 'cockpit';
type CockpitSection =
  | 'history'
  | 'examination'
  | 'investigations'
  | 'assessment'
  | 'plan'
  | 'safety'
  | 'handover';

interface SectionMeta {
  id: CockpitSection;
  label: string;
  icon: any;
  status: SectionStatus;
}

const LOCALSTORAGE_DRAFT_KEY = 'clerking_draft';

const SYSTEMS = [
  { id: 'cardiovascular', label: 'Cardiovascular' },
  { id: 'respiratory', label: 'Respiratory' },
  { id: 'gastrointestinal', label: 'GI' },
  { id: 'genitourinary', label: 'GU' },
  { id: 'neurological', label: 'Neuro' },
  { id: 'musculoskeletal', label: 'MSK' },
  { id: 'dermatological', label: 'Skin' },
  { id: 'constitutional', label: 'Constitutional' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ClerkingRoot() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const patients = usePatientStore((s) => s.patients);

  const [screen, setScreen] = useState<ClerkingScreen>('entry');
  const [currentSection, setCurrentSection] = useState<CockpitSection>('history');
  const [isSaving, setIsSaving] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [location, setLocation] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [presentingComplaint, setPresentingComplaint] = useState('');

  const [clerkingNote, setClerkingNote] = useState<Partial<ClerkingNote> | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // New patient creation
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'M' as 'M' | 'F' | 'Other',
    mrn: '',
    bedNumber: '',
  });

  useEffect(() => {
    loadDraftFromLocalStorage();
  }, []);

  function loadDraftFromLocalStorage() {
    try {
      const draftJson = localStorage.getItem(LOCALSTORAGE_DRAFT_KEY);
      if (draftJson) {
        const draft: ClerkingDraft = JSON.parse(draftJson);
        const timeSinceLastModified = Date.now() - draft.lastModified;

        if (timeSinceLastModified < 24 * 60 * 60 * 1000) {
          setClerkingNote(draft.data);
          if (draft.noteId) {
            setActiveNoteId(draft.noteId);
          }
          console.log('📄 Draft restored');
        } else {
          localStorage.removeItem(LOCALSTORAGE_DRAFT_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }

  function saveDraftToLocalStorage(data: Partial<ClerkingNote>) {
    try {
      const draft: ClerkingDraft = {
        noteId: activeNoteId || '',
        patientId: data.patientId,
        data,
        lastModified: Date.now(),
        version: 1,
      };
      localStorage.setItem(LOCALSTORAGE_DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }

  const triggerAutoSave = useCallback(
    debounce(async (noteData: Partial<ClerkingNote>) => {
      if (!activeNoteId) return;

      try {
        await updateClerkingNote(activeNoteId, noteData);
        console.log('✅ Auto-saved');
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, 2000),
    [activeNoteId]
  );

  function handleDataChange(updates: Partial<ClerkingNote>) {
    const newData = { ...clerkingNote, ...updates };
    setClerkingNote(newData);
    saveDraftToLocalStorage(newData);
    triggerAutoSave(newData);
  }

  async function handleStartClerking() {
    if (!user) {
      alert('You must be logged in to start clerking');
      return;
    }

    setIsSaving(true);

    try {
      const noteId = await createClerkingNote(
        user.id,
        user.displayName || 'Unknown',
        selectedPatientId || 'unassigned',
        {
          location: location || 'Not specified',
          workingDiagnosis: diagnosis || 'To be determined',
          diagnosisKeywords: diagnosis ? diagnosis.toLowerCase().split(/\s+/) : [],
          presentingComplaint,
        }
      );

      setActiveNoteId(noteId);

      const initialNote: Partial<ClerkingNote> = {
        id: noteId,
        patientId: selectedPatientId || 'unassigned',
        location: location || 'Not specified',
        workingDiagnosis: diagnosis || 'To be determined',
        diagnosisKeywords: diagnosis ? diagnosis.toLowerCase().split(/\s+/) : [],
        presentingComplaint,
        history: {
          medications: [],
          allergies: [],
          pastMedicalHistory: [],
          pastSurgicalHistory: [],
          systemsReview: {},
          socialHistory: {},
        },
        examination: {},
        investigations: { labs: [], imaging: [], microbiology: [], pendingResults: [] },
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

      setClerkingNote(initialNote);
      saveDraftToLocalStorage(initialNote);
      setScreen('cockpit');
    } catch (error) {
      console.error('❌ Failed to start clerking:', error);
      alert('Failed to start clerking. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveToOnCall() {
    if (!activeNoteId) {
      alert('No active clerking note. Please start clerking first.');
      return;
    }

    if (!user) {
      alert('You must be logged in.');
      return;
    }

    const confirmed = window.confirm(
      'Add this patient to On-Call list?\n\nThey will appear in On-Call Mode for quick follow-up & overnight tasks.'
    );

    if (!confirmed) return;

    setIsSaving(true);

    try {
      console.log('Saving to On-Call:', { activeNoteId, userId: user.id });
      const result = await saveClerkingToOnCall(activeNoteId, user.id);
      console.log('Result:', result);

      if (result.success) {
        alert('✅ Patient added to On-Call list!');
        localStorage.removeItem(LOCALSTORAGE_DRAFT_KEY);
        navigate('/dashboard');
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

      setSelectedPatientId(patientId);
      setShowNewPatientDialog(false);
      setNewPatientData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'M',
        mrn: '',
        bedNumber: '',
      });
      alert('✅ Patient created successfully!');
    } catch (error) {
      console.error('Failed to create patient:', error);
      alert('Failed to create patient. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  const sections: SectionMeta[] = [
    {
      id: 'history',
      label: 'History',
      icon: FileText,
      status: clerkingNote?.sectionStatus?.history || 'incomplete',
    },
    {
      id: 'examination',
      label: 'Examination',
      icon: Stethoscope,
      status: clerkingNote?.sectionStatus?.examination || 'incomplete',
    },
    {
      id: 'investigations',
      label: 'Investigations',
      icon: FlaskConical,
      status: clerkingNote?.sectionStatus?.investigations || 'incomplete',
    },
    {
      id: 'assessment',
      label: 'Assessment',
      icon: ListChecks,
      status: clerkingNote?.sectionStatus?.assessment || 'incomplete',
    },
    {
      id: 'plan',
      label: 'Plan',
      icon: Activity,
      status: clerkingNote?.sectionStatus?.plan || 'incomplete',
    },
    {
      id: 'safety',
      label: 'Safety',
      icon: Shield,
      status: clerkingNote?.sectionStatus?.safety || 'incomplete',
    },
    {
      id: 'handover',
      label: 'Handover',
      icon: Send,
      status: 'incomplete',
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: ENTRY SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  if (screen === 'entry') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-4 safe-all">
        <div className="max-w-2xl mx-auto pt-6 sm:pt-12">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Start Clerking</h1>
            <p className="text-sm sm:text-base text-slate-600">
              Quick patient clerking - all fields optional
            </p>
          </div>

          <div className="card p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Patient (optional)
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="input-field flex-1"
                >
                  <option value="">Select a patient or skip...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName} - {patient.mrn} - Bed{' '}
                      {patient.bedNumber}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewPatientDialog(true)}
                  className="btn-secondary flex items-center gap-2 px-4 whitespace-nowrap"
                  title="Create new patient"
                >
                  <UserPlus size={16} />
                  <span className="hidden sm:inline">New</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Ward 4, Bed 12 (optional)"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Working Diagnosis
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g., Community-acquired pneumonia (optional)"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Presenting Complaint
              </label>
              <textarea
                value={presentingComplaint}
                onChange={(e) => setPresentingComplaint(e.target.value)}
                placeholder="Brief summary..."
                className="input-field"
                rows={3}
              />
            </div>

            <button
              onClick={handleStartClerking}
              disabled={isSaving}
              className={clsx(
                'w-full btn-primary flex items-center justify-center gap-2 py-2.5 sm:py-3 text-base sm:text-lg',
                isSaving && 'loading-pulse'
              )}
            >
              <Plus size={20} />
              {isSaving ? 'Creating...' : 'Start Clerking'}
            </button>
          </div>

          {/* New Patient Dialog */}
          {showNewPatientDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Create New Patient</h2>
                  <button
                    onClick={() => setShowNewPatientDialog(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
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

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => setShowNewPatientDialog(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateNewPatient}
                      disabled={isSaving || !newPatientData.firstName || !newPatientData.lastName}
                      className={clsx('btn-primary flex-1', isSaving && 'loading-pulse')}
                    >
                      {isSaving ? 'Creating...' : 'Create Patient'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: CLERKING COCKPIT
  // ═══════════════════════════════════════════════════════════════════════════

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-2 sm:px-4 py-2 sm:py-3 safe-top">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <User className="text-blue-600 flex-shrink-0" size={18} />
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'New Clerking'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 truncate">
                {location || 'No location'} • {diagnosis || 'TBD'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <span className="badge bg-amber-100 text-amber-800 text-xs hidden sm:inline-flex">DRAFT</span>
            <button
              onClick={handleSaveToOnCall}
              disabled={isSaving}
              className="btn-primary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2"
            >
              <Save size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Save to On-Call</span>
              <span className="sm:hidden">Save</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="flex flex-col sm:flex-row h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)]">
        {/* LEFT: Section Navigator */}
        <div className="sm:w-64 bg-white border-b sm:border-b-0 sm:border-r border-slate-200 p-2 sm:p-4 overflow-x-auto sm:overflow-y-auto flex sm:block gap-2 sm:gap-0">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3 hidden sm:block">Sections</h3>
          <div className="flex sm:flex-col gap-2 sm:space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id)}
                className={clsx(
                  'step-item flex-shrink-0 sm:w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded',
                  currentSection === section.id && 'bg-blue-50 border-l-2 sm:border-l-4 border-blue-600'
                )}
                data-status={section.status}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <section.icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="text-xs sm:text-sm whitespace-nowrap">{section.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <SectionContent
            section={currentSection}
            clerkingNote={clerkingNote}
            onUpdate={handleDataChange}
            selectedPatient={selectedPatient}
            diagnosis={diagnosis}
          />
        </div>

        {/* RIGHT: Smart Guidance Panel - Hidden on mobile */}
        <div className="hidden lg:block w-80 bg-slate-50 border-l border-slate-200 p-4 overflow-y-auto">
          <SmartGuidancePanel diagnosis={diagnosis} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION ROUTER
// ═══════════════════════════════════════════════════════════════════════════

interface SectionProps {
  section: CockpitSection;
  clerkingNote: Partial<ClerkingNote> | null;
  onUpdate: (updates: Partial<ClerkingNote>) => void;
  selectedPatient: any;
  diagnosis: string;
}

function SectionContent({ section, clerkingNote, onUpdate, selectedPatient, diagnosis }: SectionProps) {
  if (!clerkingNote) return <div className="text-slate-500">Loading...</div>;

  switch (section) {
    case 'history':
      return <HistorySection clerkingNote={clerkingNote} onUpdate={onUpdate} />;
    case 'examination':
      return <ExaminationSection clerkingNote={clerkingNote} onUpdate={onUpdate} />;
    case 'investigations':
      return <InvestigationsSection clerkingNote={clerkingNote} onUpdate={onUpdate} />;
    case 'assessment':
      return <AssessmentSection clerkingNote={clerkingNote} onUpdate={onUpdate} />;
    case 'plan':
      return <PlanSection clerkingNote={clerkingNote} onUpdate={onUpdate} />;
    case 'safety':
      return <SafetySection clerkingNote={clerkingNote} onUpdate={onUpdate} />;
    case 'handover':
      return <HandoverSection clerkingNote={clerkingNote} selectedPatient={selectedPatient} />;
    default:
      return <div>Unknown section</div>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function HistorySection({ clerkingNote, onUpdate }: Pick<SectionProps, 'clerkingNote' | 'onUpdate'>) {
  if (!clerkingNote) return null;
  const history = clerkingNote.history || {};
  const [newMed, setNewMed] = useState<Partial<Medication>>({ name: '', dose: '', frequency: '', route: 'PO' });
  const [newAllergy, setNewAllergy] = useState<Partial<Allergy>>({ substance: '', reaction: '', severity: 'mild', type: 'drug' });

  function addMedication() {
    if (!newMed.name?.trim()) return;
    const medications = [...(history.medications || []), newMed as Medication];
    onUpdate({ history: { ...history, medications } });
    setNewMed({ name: '', dose: '', frequency: '', route: 'PO' });
  }

  function removeMedication(index: number) {
    const medications = history.medications?.filter((_, i) => i !== index) || [];
    onUpdate({ history: { ...history, medications } });
  }

  function addAllergy() {
    if (!newAllergy.substance?.trim()) return;
    const allergies = [...(history.allergies || []), newAllergy as Allergy];
    onUpdate({ history: { ...history, allergies } });
    setNewAllergy({ substance: '', reaction: '', severity: 'mild', type: 'drug' });
  }

  function removeAllergy(index: number) {
    const allergies = history.allergies?.filter((_, i) => i !== index) || [];
    onUpdate({ history: { ...history, allergies } });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <FileText size={20} />
        History
      </h2>

      {/* HPI */}
      <div className="card p-4">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          History of Presenting Illness
        </label>
        <textarea
          value={history.historyOfPresentingIllness || ''}
          onChange={(e) => onUpdate({ history: { ...history, historyOfPresentingIllness: e.target.value } })}
          placeholder="Detailed history of the presenting complaint..."
          className="input-field"
          rows={5}
        />
      </div>

      {/* PMH & PSH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Past Medical History</label>
          <textarea
            value={(history.pastMedicalHistory || []).join('\n')}
            onChange={(e) => onUpdate({
              history: {
                ...history,
                pastMedicalHistory: e.target.value.split('\n').filter(l => l.trim())
              }
            })}
            placeholder="One condition per line..."
            className="input-field"
            rows={3}
          />
        </div>

        <div className="card p-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Past Surgical History</label>
          <textarea
            value={(history.pastSurgicalHistory || []).join('\n')}
            onChange={(e) => onUpdate({
              history: {
                ...history,
                pastSurgicalHistory: e.target.value.split('\n').filter(l => l.trim())
              }
            })}
            placeholder="One procedure per line..."
            className="input-field"
            rows={3}
          />
        </div>
      </div>

      {/* Medications */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Pill size={16} />
          Medications
        </h3>

        <div className="space-y-2 mb-3">
          {(history.medications || []).map((med, idx) => (
            <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded">
              <div className="flex-1">
                <span className="font-medium text-sm">{med.name}</span>
                <span className="text-xs text-slate-600 ml-2">
                  {med.dose} {med.frequency} ({med.route})
                </span>
              </div>
              <button onClick={() => removeMedication(idx)} className="text-red-600 hover:text-red-800">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            value={newMed.name || ''}
            onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
            placeholder="Medication"
            className="input-field text-sm"
          />
          <input
            type="text"
            value={newMed.dose || ''}
            onChange={(e) => setNewMed({ ...newMed, dose: e.target.value })}
            placeholder="Dose"
            className="input-field text-sm"
          />
          <input
            type="text"
            value={newMed.frequency || ''}
            onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
            placeholder="Frequency"
            className="input-field text-sm"
          />
          <button onClick={addMedication} className="btn-primary text-sm py-2">
            <Plus size={14} className="inline mr-1" />
            Add
          </button>
        </div>
      </div>

      {/* Allergies */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <AlertTriangle size={16} />
          Allergies
        </h3>

        <div className="space-y-2 mb-3">
          {(history.allergies || []).map((allergy, idx) => (
            <div key={idx} className="flex items-center justify-between bg-red-50 p-2 rounded border border-red-200">
              <div className="flex-1">
                <span className="font-medium text-sm text-red-900">{allergy.substance}</span>
                <span className="text-xs text-red-700 ml-2">
                  {allergy.reaction} ({allergy.severity})
                </span>
              </div>
              <button onClick={() => removeAllergy(idx)} className="text-red-600 hover:text-red-800">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {(history.allergies || []).length === 0 && (
            <div className="text-xs text-slate-500 italic">No known allergies</div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            value={newAllergy.substance || ''}
            onChange={(e) => setNewAllergy({ ...newAllergy, substance: e.target.value })}
            placeholder="Allergen"
            className="input-field text-sm"
          />
          <input
            type="text"
            value={newAllergy.reaction || ''}
            onChange={(e) => setNewAllergy({ ...newAllergy, reaction: e.target.value })}
            placeholder="Reaction"
            className="input-field text-sm"
          />
          <select
            value={newAllergy.severity || 'mild'}
            onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value as any })}
            className="input-field text-sm"
          >
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
            <option value="life-threatening">Life-threatening</option>
          </select>
          <button onClick={addAllergy} className="btn-primary text-sm py-2">
            <Plus size={14} className="inline mr-1" />
            Add
          </button>
        </div>
      </div>

      {/* Systems Review */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Systems Review</h3>
        <div className="space-y-2">
          {SYSTEMS.map((sys) => (
            <div key={sys.id}>
              <label className="block text-xs text-slate-600 mb-1">{sys.label}</label>
              <textarea
                value={(history.systemsReview as any)?.[sys.id] || ''}
                onChange={(e) => onUpdate({
                  history: {
                    ...history,
                    systemsReview: { ...history.systemsReview, [sys.id]: e.target.value }
                  }
                })}
                placeholder="Enter findings or 'NAD'..."
                className="input-field text-sm"
                rows={1}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExaminationSection({ clerkingNote, onUpdate }: Pick<SectionProps, 'clerkingNote' | 'onUpdate'>) {
  if (!clerkingNote) return null;
  const exam = clerkingNote.examination || {};

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Stethoscope size={20} />
        Physical Examination
      </h2>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">General Appearance</h3>
        <textarea
          value={exam.general?.appearance || ''}
          onChange={(e) => onUpdate({
            examination: {
              ...exam,
              general: { ...(exam.general || { distress: false, hydration: '', pallor: false, jaundice: false, cyanosis: false }), appearance: e.target.value }
            }
          })}
          placeholder="Well/unwell, comfortable at rest..."
          className="input-field"
          rows={2}
        />
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Vital Signs</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">HR (bpm)</label>
            <input
              type="number"
              value={exam.vitals?.heartRate || ''}
              onChange={(e) => onUpdate({
                examination: {
                  ...exam,
                  vitals: { ...(exam.vitals || { timestamp: new Date() }), heartRate: e.target.value ? Number(e.target.value) : undefined }
                }
              })}
              className="input-field text-sm"
              placeholder="72"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Sys (mmHg)</label>
            <input
              type="number"
              value={exam.vitals?.bloodPressureSystolic || ''}
              onChange={(e) => onUpdate({
                examination: {
                  ...exam,
                  vitals: { ...(exam.vitals || { timestamp: new Date() }), bloodPressureSystolic: e.target.value ? Number(e.target.value) : undefined }
                }
              })}
              className="input-field text-sm"
              placeholder="120"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Dia (mmHg)</label>
            <input
              type="number"
              value={exam.vitals?.bloodPressureDiastolic || ''}
              onChange={(e) => onUpdate({
                examination: {
                  ...exam,
                  vitals: { ...(exam.vitals || { timestamp: new Date() }), bloodPressureDiastolic: e.target.value ? Number(e.target.value) : undefined }
                }
              })}
              className="input-field text-sm"
              placeholder="80"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">RR (/min)</label>
            <input
              type="number"
              value={exam.vitals?.respiratoryRate || ''}
              onChange={(e) => onUpdate({
                examination: {
                  ...exam,
                  vitals: { ...(exam.vitals || { timestamp: new Date() }), respiratoryRate: e.target.value ? Number(e.target.value) : undefined }
                }
              })}
              className="input-field text-sm"
              placeholder="16"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">SpO2 (%)</label>
            <input
              type="number"
              value={exam.vitals?.oxygenSaturation || ''}
              onChange={(e) => onUpdate({
                examination: {
                  ...exam,
                  vitals: { ...(exam.vitals || { timestamp: new Date() }), oxygenSaturation: e.target.value ? Number(e.target.value) : undefined }
                }
              })}
              className="input-field text-sm"
              placeholder="98"
            />
          </div>
        </div>
      </div>

      {/* System Exams */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">System Examination</h3>
        <div className="space-y-3">
          {(['cardiovascular', 'respiratory', 'abdominal', 'neurological'] as const).map((sys) => (
            <div key={sys}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 capitalize">{sys}</label>
                <button
                  onClick={() => onUpdate({
                    examination: {
                      ...exam,
                      [sys]: { findings: '', isNormal: !(exam[sys] as any)?.isNormal || false }
                    }
                  })}
                  className={clsx(
                    'px-2 py-1 text-xs rounded border',
                    (exam[sys] as any)?.isNormal
                      ? 'bg-green-100 border-green-300 text-green-800'
                      : 'bg-white border-slate-300'
                  )}
                >
                  {(exam[sys] as any)?.isNormal ? '✓ Normal' : 'Mark Normal'}
                </button>
              </div>
              {!(exam[sys] as any)?.isNormal && (
                <textarea
                  value={(exam[sys] as any)?.findings || ''}
                  onChange={(e) => onUpdate({
                    examination: {
                      ...exam,
                      [sys]: { findings: e.target.value, isNormal: false }
                    }
                  })}
                  placeholder="Document findings..."
                  className="input-field text-sm"
                  rows={2}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvestigationsSection({ clerkingNote, onUpdate }: Pick<SectionProps, 'clerkingNote' | 'onUpdate'>) {
  if (!clerkingNote) return null;
  const inv = clerkingNote.investigations || { labs: [], imaging: [], microbiology: [], pendingResults: [] };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <FlaskConical size={20} />
        Investigations
      </h2>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Lab Results Summary</h3>
        <textarea
          placeholder="Key lab results..."
          className="input-field text-sm"
          rows={6}
        />
        <p className="text-xs text-slate-500 mt-2">
          Integration with Labs module in progress
        </p>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Imaging & Microbiology</h3>
        <textarea
          placeholder="CXR, CT, cultures..."
          className="input-field text-sm"
          rows={4}
        />
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Pending Results</h3>
        <textarea
          value={(inv.pendingResults || []).join('\n')}
          onChange={(e) => onUpdate({
            investigations: {
              ...inv,
              pendingResults: e.target.value.split('\n').filter(l => l.trim())
            }
          })}
          placeholder="One test per line..."
          className="input-field text-sm"
          rows={3}
        />
      </div>
    </div>
  );
}

function AssessmentSection({ clerkingNote, onUpdate }: Pick<SectionProps, 'clerkingNote' | 'onUpdate'>) {
  if (!clerkingNote) return null;
  const problemList = clerkingNote.problemList || [];
  const [newProblem, setNewProblem] = useState({ title: '', evidence: '', severity: 'medium' as const });

  function addProblem() {
    if (!newProblem.title.trim()) return;
    const updated = [...problemList, {
      id: Date.now().toString(),
      title: newProblem.title,
      evidence: [newProblem.evidence],
      severity: newProblem.severity,
      plan: [],
      tasks: [],
      isActive: true
    } as ProblemListItem];
    onUpdate({ problemList: updated });
    setNewProblem({ title: '', evidence: '', severity: 'medium' });
  }

  function removeProblem(id: string) {
    const updated = problemList.filter((p) => p.id !== id);
    onUpdate({ problemList: updated });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <ListChecks size={20} />
        Assessment & Problem List
      </h2>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Active Problems</h3>

        <div className="space-y-3 mb-4">
          {problemList.map((problem, idx) => (
            <div key={problem.id} className="bg-slate-50 p-3 rounded border border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{idx + 1}. {problem.title}</span>
                    <span className={clsx(
                      'px-2 py-0.5 text-xs rounded-full',
                      problem.severity === 'critical' && 'bg-red-100 text-red-800',
                      problem.severity === 'high' && 'bg-orange-100 text-orange-800',
                      problem.severity === 'medium' && 'bg-amber-100 text-amber-800',
                      problem.severity === 'low' && 'bg-green-100 text-green-800'
                    )}>
                      {problem.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{problem.evidence.join(', ')}</p>
                </div>
                <button onClick={() => removeProblem(problem.id)} className="text-red-600 hover:text-red-800 ml-2">
                  <Trash2 size={14} />
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
            placeholder="Problem/Diagnosis"
            className="input-field text-sm"
          />
          <textarea
            value={newProblem.evidence}
            onChange={(e) => setNewProblem({ ...newProblem, evidence: e.target.value })}
            placeholder="Evidence..."
            className="input-field text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <select
              value={newProblem.severity}
              onChange={(e) => setNewProblem({ ...newProblem, severity: e.target.value as any })}
              className="input-field text-sm flex-1"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button onClick={addProblem} className="btn-primary text-sm px-4">
              <Plus size={14} className="inline mr-1" />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanSection({ clerkingNote, onUpdate }: Pick<SectionProps, 'clerkingNote' | 'onUpdate'>) {
  if (!clerkingNote) return null;
  const plan = clerkingNote.plan || {};
  const [newConsult, setNewConsult] = useState<Partial<ConsultRequest>>({ specialty: '', reason: '', status: 'pending' });

  function addConsult() {
    if (!newConsult.specialty?.trim()) return;
    const consults = [...(plan.consults || []), newConsult as ConsultRequest];
    onUpdate({ plan: { ...plan, consults } });
    setNewConsult({ specialty: '', reason: '', status: 'pending' });
  }

  function removeConsult(index: number) {
    const consults = plan.consults?.filter((_, i) => i !== index) || [];
    onUpdate({ plan: { ...plan, consults } });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Activity size={20} />
        Management Plan
      </h2>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Management Summary</h3>
        <textarea
          placeholder="Overall management approach, medications, investigations..."
          className="input-field text-sm"
          rows={6}
        />
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Consults & Referrals</h3>
        <div className="space-y-2 mb-3">
          {(plan.consults || []).map((consult, idx) => (
            <div key={idx} className="flex items-center justify-between bg-purple-50 p-2 rounded border border-purple-200">
              <div className="flex-1">
                <span className="font-medium text-sm">{consult.specialty}</span>
                <span className="text-xs text-slate-600 ml-2">({consult.status})</span>
                <div className="text-xs text-slate-600 mt-0.5">{consult.reason}</div>
              </div>
              <button onClick={() => removeConsult(idx)} className="text-red-600 hover:text-red-800">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={newConsult.specialty || ''}
            onChange={(e) => setNewConsult({ ...newConsult, specialty: e.target.value })}
            placeholder="Specialty"
            className="input-field text-sm"
          />
          <input
            type="text"
            value={newConsult.reason || ''}
            onChange={(e) => setNewConsult({ ...newConsult, reason: e.target.value })}
            placeholder="Reason"
            className="input-field text-sm"
          />
          <button onClick={addConsult} className="btn-primary text-sm py-2">
            <Plus size={14} className="inline mr-1" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function SafetySection({ clerkingNote, onUpdate }: Pick<SectionProps, 'clerkingNote' | 'onUpdate'>) {
  if (!clerkingNote) return null;
  const safety = clerkingNote.safety || {};

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Shield size={20} />
        Safety Checklist
      </h2>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">VTE Prophylaxis</h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={safety.vteProph?.considered || false}
            onChange={(e) => onUpdate({
              safety: { ...safety, vteProph: { considered: e.target.checked } }
            })}
            className="rounded"
          />
          <span className="text-sm">VTE risk assessed & addressed</span>
        </label>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Falls Risk</h3>
        <select
          value={safety.fallsRisk?.risk || 'low'}
          onChange={(e) => onUpdate({
            safety: { ...safety, fallsRisk: { risk: e.target.value as any } }
          })}
          className="input-field text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Other Safety Considerations</h3>
        <textarea
          placeholder="GI prophylaxis, lines review, pressure injury risk..."
          className="input-field text-sm"
          rows={4}
        />
      </div>
    </div>
  );
}

function HandoverSection({ clerkingNote, selectedPatient }: Pick<SectionProps, 'clerkingNote' | 'selectedPatient'>) {
  const [sbar, setSbar] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleGenerateSBAR() {
    if (!clerkingNote) return;

    setGenerating(true);
    try {
      const patientName = selectedPatient
        ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
        : 'Patient';
      const sbarText = generateSBAR(clerkingNote as any, patientName);
      setSbar(sbarText);
    } catch (error) {
      const fallback = constructManualSBAR(clerkingNote, selectedPatient);
      setSbar(fallback);
    } finally {
      setGenerating(false);
    }
  }

  function constructManualSBAR(note: Partial<ClerkingNote>, patient: any): string {
    const name = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient';
    return `
SBAR HANDOVER
═════════════════════════════

SITUATION
${name} (MRN: ${patient?.mrn || 'N/A'})
Location: ${note.location || 'N/A'}
Working Diagnosis: ${note.workingDiagnosis || 'TBD'}

BACKGROUND
History: ${note.history?.historyOfPresentingIllness || 'Not documented'}
PMH: ${note.history?.pastMedicalHistory?.join(', ') || 'None'}
Medications: ${note.history?.medications?.map(m => m.name).join(', ') || 'None'}
Allergies: ${note.history?.allergies?.map(a => a.substance).join(', ') || 'NKDA'}

ASSESSMENT
Problems: ${note.problemList?.map(p => p.title).join(', ') || 'None'}

RECOMMENDATION
Tasks: Review patient management
Pending: ${note.investigations?.pendingResults?.join(', ') || 'None'}

Generated: ${new Date().toLocaleString()}
    `.trim();
  }

  function handleCopy() {
    navigator.clipboard.writeText(sbar);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Send size={20} />
        Handover (SBAR)
      </h2>

      {!sbar ? (
        <div className="card p-8 text-center">
          <button
            onClick={handleGenerateSBAR}
            disabled={generating}
            className={clsx('btn-primary px-6 py-3', generating && 'loading-pulse')}
          >
            {generating ? 'Generating...' : 'Generate SBAR'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="card p-4 bg-slate-900 text-slate-100">
            <pre className="whitespace-pre-wrap text-xs font-mono">{sbar}</pre>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn-secondary flex items-center gap-2 flex-1">
              <Copy size={16} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={handleGenerateSBAR} className="btn-secondary">
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SmartGuidancePanel({ diagnosis }: { diagnosis: string }) {
  const template = matchTemplate(diagnosis);

  if (!template || template.id === 'default') {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <AlertCircle size={16} />
          Smart Guidance
        </h3>
        <div className="text-xs text-slate-500 italic">
          Enter a working diagnosis for specialty-specific guidance
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
        <AlertCircle size={16} />
        {template.name}
      </h3>

      {template.redFlags.length > 0 && (
        <div className="card p-3 bg-red-50 border-red-200">
          <h4 className="text-xs font-semibold text-red-900 mb-2 flex items-center gap-1">
            <AlertTriangle size={12} />
            Red Flags
          </h4>
          <ul className="space-y-1">
            {template.redFlags.map((flag, i) => (
              <li key={i} className="text-xs text-red-800">• {flag}</li>
            ))}
          </ul>
        </div>
      )}

      {template.examFocus.length > 0 && (
        <div className="card p-3">
          <h4 className="text-xs font-semibold text-slate-700 mb-2">Exam Focus</h4>
          <ul className="space-y-1">
            {template.examFocus.map((item, i) => (
              <li key={i} className="text-xs text-slate-600">• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {template.investigations.length > 0 && (
        <div className="card p-3">
          <h4 className="text-xs font-semibold text-slate-700 mb-2">Key Investigations</h4>
          <ul className="space-y-1">
            {template.investigations.map((inv, i) => (
              <li key={i} className="text-xs text-slate-600">• {inv}</li>
            ))}
          </ul>
        </div>
      )}

      {template.managementPearls.length > 0 && (
        <div className="card p-3 bg-blue-50 border-blue-200">
          <h4 className="text-xs font-semibold text-blue-900 mb-2">Management Pearls</h4>
          <ul className="space-y-1">
            {template.managementPearls.map((pearl, i) => (
              <li key={i} className="text-xs text-blue-800">💡 {pearl}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

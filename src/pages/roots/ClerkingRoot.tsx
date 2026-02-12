/**
 * Clerking Mode Root Component
 * Premium structured clinical clerking workflow with AI assistance
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
  ChevronRight,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { debounce, showSkeletonLoader, hideSkeletonLoader } from '@/utils/uiEffects';
import {
  createClerkingNote,
  updateClerkingNote,
  saveClerkingToOnCall,
  generateSBAR,
} from '@/services/firebase/clerkingNotes';
import type { ClerkingNote, SectionStatus, ClerkingDraft } from '@/types/clerking';
import { matchTemplate } from '@/types/clerking';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ClerkingRoot() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const patients = usePatientStore((s) => s.patients);

  // Screen state
  const [screen, setScreen] = useState<ClerkingScreen>('entry');
  const [currentSection, setCurrentSection] = useState<CockpitSection>('history');
  const [isSaving, setIsSaving] = useState(false);

  // Entry form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [location, setLocation] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [presentingComplaint, setPresentingComplaint] = useState('');

  // Clerking note state
  const [clerkingNote, setClerkingNote] = useState<Partial<ClerkingNote> | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Auto-save timer
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================================================
  // LIFECYCLE: Load draft on mount
  // ============================================================================

  useEffect(() => {
    loadDraftFromLocalStorage();
  }, []);

  // ============================================================================
  // DRAFT PERSISTENCE
  // ============================================================================

  function loadDraftFromLocalStorage() {
    try {
      const draftJson = localStorage.getItem(LOCALSTORAGE_DRAFT_KEY);
      if (draftJson) {
        const draft: ClerkingDraft = JSON.parse(draftJson);
        const timeSinceLastModified = Date.now() - draft.lastModified;

        // If draft is less than 24 hours old, restore it
        if (timeSinceLastModified < 24 * 60 * 60 * 1000) {
          setClerkingNote(draft.data);
          if (draft.noteId) {
            setActiveNoteId(draft.noteId);
          }
          console.log('📄 Draft restored from localStorage');
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

  // ============================================================================
  // AUTO-SAVE LOGIC (Debounced)
  // ============================================================================

  const triggerAutoSave = useCallback(
    debounce(async (noteData: Partial<ClerkingNote>) => {
      if (!activeNoteId) return;

      try {
        await updateClerkingNote(activeNoteId, noteData);
        console.log('✅ Auto-saved to Firestore');
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, 2000),
    [activeNoteId]
  );

  function handleDataChange(updates: Partial<ClerkingNote>) {
    const newData = { ...clerkingNote, ...updates };
    setClerkingNote(newData);

    // Immediate local save
    saveDraftToLocalStorage(newData);

    // Debounced cloud save
    triggerAutoSave(newData);
  }

  // ============================================================================
  // ENTRY SCREEN: Start Clerking
  // ============================================================================

  async function handleStartClerking() {
    if (!user) {
      alert('You must be logged in to start clerking');
      return;
    }

    // Allow clerking without patient or diagnosis - flexible workflow
    setIsSaving(true);

    try {
      // Create initial clerking note
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

      // Load template based on diagnosis
      const template = matchTemplate(diagnosis);

      // Initialize note structure
      const initialNote: Partial<ClerkingNote> = {
        id: noteId,
        patientId: selectedPatientId,
        location,
        workingDiagnosis: diagnosis,
        diagnosisKeywords: diagnosis.toLowerCase().split(/\s+/),
        presentingComplaint,
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

      setClerkingNote(initialNote);
      saveDraftToLocalStorage(initialNote);

      // Switch to cockpit
      setScreen('cockpit');
      console.log('✅ Clerking started with template:', template.name);
    } catch (error) {
      console.error('❌ Failed to start clerking:', error);
      alert('Failed to start clerking. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================================================
  // SECTION NAVIGATION
  // ============================================================================

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

  // ============================================================================
  // SAVE TO ON-CALL
  // ============================================================================

  async function handleSaveToOnCall() {
    if (!activeNoteId) return;

    const confirmed = window.confirm(
      'Add this patient to On-Call list?\n\nThey will appear in On-Call Mode for quick follow-up & overnight tasks.'
    );

    if (!confirmed) return;

    setIsSaving(true);

    try {
      const result = await saveClerkingToOnCall(activeNoteId, user!.id);

      if (result.success) {
        alert('✅ Patient added to On-Call list successfully!');
        localStorage.removeItem(LOCALSTORAGE_DRAFT_KEY);
        navigate('/dashboard');
      } else {
        alert(`❌ Failed to add to On-Call: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Save to On-Call failed:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================================================
  // RENDER: ENTRY SCREEN
  // ============================================================================

  if (screen === 'entry') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-4 safe-all">
        <div className="max-w-2xl mx-auto pt-6 sm:pt-12">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Start Clerking</h1>
            <p className="text-sm sm:text-base text-slate-600">
              Quick patient clerking - all fields optional
            </p>
          </div>

          {/* Entry Card */}
          <div className="card p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Patient (optional)
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="input-field"
              >
                <option value="">Select a patient or skip...</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName} - {patient.mrn} - Bed{' '}
                    {patient.bedNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
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

            {/* Working Diagnosis */}
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

            {/* Presenting Complaint */}
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

            {/* Action Button */}
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
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: CLERKING COCKPIT
  // ============================================================================

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-2 sm:px-4 py-2 sm:py-3 safe-top">
        <div className="flex items-center justify-between gap-2">
          {/* Patient Identity Strip */}
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

          {/* Status & Actions */}
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
        {/* LEFT: Section Navigator - Mobile: Horizontal scroll, Desktop: Sidebar */}
        <div className="sm:w-64 bg-white border-b sm:border-b-0 sm:border-r border-slate-200 p-2 sm:p-4 overflow-x-auto sm:overflow-y-auto flex sm:block gap-2 sm:gap-0">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3 hidden sm:block">Sections</h3>
          <div className="flex sm:flex-col gap-2 sm:space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id)}
                className={clsx(
                  'step-item flex-shrink-0 sm:w-full text-left px-3 sm:px-4 py-2 sm:py-3',
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

// ============================================================================
// SECTION CONTENT ROUTER
// ============================================================================

interface SectionContentProps {
  section: CockpitSection;
  clerkingNote: Partial<ClerkingNote> | null;
  onUpdate: (updates: Partial<ClerkingNote>) => void;
}

function SectionContent({ section, clerkingNote, onUpdate }: SectionContentProps) {
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
      return <HandoverSection clerkingNote={clerkingNote} />;
    default:
      return <div>Section not implemented yet</div>;
  }
}

// ============================================================================
// PLACEHOLDER SECTION COMPONENTS (To be expanded)
// ============================================================================

function HistorySection({ clerkingNote, onUpdate }: Omit<SectionContentProps, 'section'>) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">History</h2>
      <p className="text-slate-600 mb-6">
        Complete the clinical history. Fields will be structured into HPI, PMH, medications, and
        allergies.
      </p>
      <div className="card p-4 bg-blue-50 border-blue-200">
        <AlertCircle className="inline mr-2 text-blue-600" size={20} />
        <span className="text-sm text-blue-900">
          Full History section UI coming in next iteration
        </span>
      </div>
    </div>
  );
}

function ExaminationSection({ clerkingNote, onUpdate }: Omit<SectionContentProps, 'section'>) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Examination</h2>
      <div className="card p-4 bg-blue-50 border-blue-200">
        <AlertCircle className="inline mr-2 text-blue-600" size={20} />
        <span className="text-sm text-blue-900">
          Full Examination section with vitals + system exam coming next
        </span>
      </div>
    </div>
  );
}

function InvestigationsSection({ clerkingNote, onUpdate }: Omit<SectionContentProps, 'section'>) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Investigations</h2>
      <div className="card p-4 bg-blue-50 border-blue-200">
        <AlertCircle className="inline mr-2 text-blue-600" size={20} />
        <span className="text-sm text-blue-900">
          Labs, imaging, and microbiology panels integration coming next
        </span>
      </div>
    </div>
  );
}

function AssessmentSection({ clerkingNote, onUpdate }: Omit<SectionContentProps, 'section'>) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Assessment & Problem List</h2>
      <div className="card p-4 bg-blue-50 border-blue-200">
        <AlertCircle className="inline mr-2 text-blue-600" size={20} />
        <span className="text-sm text-blue-900">
          Problem list builder with evidence linking coming next
        </span>
      </div>
    </div>
  );
}

function PlanSection({ clerkingNote, onUpdate }: Omit<SectionContentProps, 'section'>) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Plan</h2>
      <div className="card p-4 bg-blue-50 border-blue-200">
        <AlertCircle className="inline mr-2 text-blue-600" size={20} />
        <span className="text-sm text-blue-900">
          Order-set style plan builder (monitoring, fluids, meds, investigations) coming next
        </span>
      </div>
    </div>
  );
}

function SafetySection({ clerkingNote, onUpdate }: Omit<SectionContentProps, 'section'>) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Safety Checklist</h2>
      <div className="card p-4 bg-blue-50 border-blue-200">
        <AlertCircle className="inline mr-2 text-blue-600" size={20} />
        <span className="text-sm text-blue-900">
          VTE prophylaxis, GI prophylaxis, falls risk, and red flags coming next
        </span>
      </div>
    </div>
  );
}

function HandoverSection({ clerkingNote }: { clerkingNote: Partial<ClerkingNote> | null }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Handover Output</h2>
      <div className="card p-4 bg-blue-50 border-blue-200">
        <AlertCircle className="inline mr-2 text-blue-600" size={20} />
        <span className="text-sm text-blue-900">
          SBAR generation and handover output coming next
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// SMART GUIDANCE PANEL
// ============================================================================

function SmartGuidancePanel({ diagnosis }: { diagnosis: string }) {
  const template = matchTemplate(diagnosis);

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Smart Guidance</h3>

      {/* Red Flags */}
      {template.redFlags.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-red-700 uppercase mb-2">Red Flags</h4>
          <div className="space-y-1">
            {template.redFlags.map((flag, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-red-900">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{flag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exam Focus */}
      {template.examFocus.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-blue-700 uppercase mb-2">Key Exam Points</h4>
          <ul className="text-sm text-slate-700 space-y-1">
            {template.examFocus.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Investigations */}
      {template.investigations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-purple-700 uppercase mb-2">Investigations</h4>
          <ul className="text-sm text-slate-700 space-y-1">
            {template.investigations.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Management Pearls */}
      {template.managementPearls.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-green-700 uppercase mb-2">Management</h4>
          <ul className="text-sm text-slate-700 space-y-2">
            {template.managementPearls.map((pearl, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                {pearl}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

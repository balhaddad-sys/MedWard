/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Stethoscope,
  Plus,
  UserPlus,
  X,
  Clock,
  Send,
  Trash2,
  AlertTriangle,
  Pill,
  FileText,
  Activity,
  Target,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { createPatient } from '@/services/firebase/patients';
import {
  createClerkingNote,
  updateClerkingNote,
  saveClerkingToOnCall,
} from '@/services/firebase/clerkingNotes';
import type {
  ClerkingNote,
  Medication,
  Allergy,
  ProblemListItem,
} from '@/types/clerking';
import { validateClerkingNote } from '@/utils/safetyValidators';
import { SafetyValidationModal } from '@/components/modals/SafetyValidationModal';
import type { ValidationResult } from '@/utils/safetyValidators';
import { ClerkingProgress } from '@/components/features/clerking/ClerkingProgress';
import { ClerkingSection } from '@/components/features/clerking/ClerkingSection';
import { ClerkingQuickSave } from '@/components/features/clerking/ClerkingQuickSave';

const LOCALSTORAGE_DRAFT_KEY = 'clerking_draft_v3';
const AUTOSAVE_INTERVAL = 3000;

export default function ClerkingRoot() {
  const user = useAuthStore((s) => s.user);
  const _navigate = useNavigate();
  const patients = usePatientStore((s) => s.patients);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [clerkingNote, setClerkingNote] = useState<Partial<ClerkingNote> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // PHASE 1: Safety validation modal state
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safetyValidation, setSafetyValidation] = useState<ValidationResult | null>(null);

  // PHASE 3: 60-second clerking state
  const [startTime, setStartTime] = useState<Date>(new Date());

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
    loadDraft();
  }, []);

  useEffect(() => {
    if (!clerkingNote || !activeNoteId) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => autoSave(), AUTOSAVE_INTERVAL) as any;
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkingNote, activeNoteId]);

  function loadDraft() {
    try {
      const draft = localStorage.getItem(LOCALSTORAGE_DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        setClerkingNote(parsed.note);
        setActiveNoteId(parsed.noteId);
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
  }

  function saveDraft() {
    if (!clerkingNote || !activeNoteId) return;
    try {
      localStorage.setItem(LOCALSTORAGE_DRAFT_KEY, JSON.stringify({ note: clerkingNote, noteId: activeNoteId }));
    } catch (e) {
      console.error('Failed to save draft:', e);
    }
  }

  async function autoSave() {
    if (!activeNoteId || !clerkingNote) return;
    try {
      await updateClerkingNote(activeNoteId, clerkingNote);
      setLastSaved(new Date());
      saveDraft();
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }

  async function handleStart() {
    if (!user) {
      alert('You must be logged in');
      return;
    }
    setIsSaving(true);
    try {
      const noteId = await createClerkingNote(user.id, user.displayName, 'unassigned', {
        location: '',
        workingDiagnosis: 'Assessment pending',
        presentingComplaint: '',
        diagnosisKeywords: [],
      });
      const newNote: Partial<ClerkingNote> = {
        id: noteId,
        patientId: 'unassigned',
        authorId: user.id,
        authorName: user.displayName,
        status: 'draft',
        location: '',
        workingDiagnosis: 'Assessment pending',
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
      };
      setClerkingNote(newNote);
      setActiveNoteId(noteId);
      setStartTime(new Date()); // PHASE 3: Start timer
      saveDraft();
    } catch (e) {
      console.error('Failed to start:', e);
      alert('Failed to start clerking');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreatePatient() {
    if (!newPatientData.firstName || !newPatientData.lastName || !user) {
      alert('First and last name required');
      return;
    }
    setIsSaving(true);
    try {
      const patientId = await createPatient(
        {
          ...newPatientData,
          wardId: user.wardIds?.[0] || 'default',
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
        } as any,
        user.id
      );
      update({ patientId });
      setShowNewPatientDialog(false);
      setNewPatientData({ firstName: '', lastName: '', dateOfBirth: '', gender: 'M', mrn: '', bedNumber: '' });
      alert('✅ Patient created!');
    } catch (e) {
      console.error(e);
      alert('Failed to create patient');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveToOnCall() {
    if (!activeNoteId || !user) {
      alert('No active note');
      return;
    }
    if (!clerkingNote) {
      alert('No active note');
      return;
    }
    if (!clerkingNote.patientId || clerkingNote.patientId === 'unassigned') {
      alert('Please assign a patient before saving to On-Call');
      return;
    }

    // PHASE 1: Run safety validation before signing
    const safetyResult = validateClerkingNote(clerkingNote);

    // If there are blockers or warnings, show modal
    if (safetyResult.blockers.length > 0 || safetyResult.warnings.length > 0) {
      setSafetyValidation(safetyResult);
      setShowSafetyModal(true);
      return;
    }

    // If validation passes, proceed with save
    await performSaveToOnCall();
  }

  async function performSaveToOnCall() {
    if (!activeNoteId || !user) return;

    const confirmed = window.confirm('Add to On-Call list?');
    if (!confirmed) return;

    setIsSaving(true);
    try {
      // Flush local changes first so transaction reads the latest patient linkage/content.
      await updateClerkingNote(activeNoteId, clerkingNote!);
      const result = await saveClerkingToOnCall(activeNoteId, user.id, user.displayName);
      if (result.success) {
        alert('✅ Added to On-Call!');
        localStorage.removeItem(LOCALSTORAGE_DRAFT_KEY);
        setClerkingNote(null);
        setActiveNoteId(null);
      } else {
        alert(`❌ Failed: ${result.error}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
      setShowSafetyModal(false);
    }
  }

  function handleDiscard() {
    if (!window.confirm('Discard? All unsaved data will be lost.')) return;
    localStorage.removeItem(LOCALSTORAGE_DRAFT_KEY);
    setClerkingNote(null);
    setActiveNoteId(null);
  }

  // PHASE 3: Quick save for 60-second clerking workflow
  async function handleQuickSave() {
    if (!activeNoteId || !clerkingNote) return;
    setIsSaving(true);
    try {
      await updateClerkingNote(activeNoteId, clerkingNote);
      setLastSaved(new Date());
      saveDraft();
      alert('✅ Draft saved! You can continue editing later.');
    } catch (e) {
      console.error('Quick save failed:', e);
      alert('❌ Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  }

  function update(changes: Partial<ClerkingNote>) {
    setClerkingNote((prev) => ({ ...prev, ...changes }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LANDING
  // ═══════════════════════════════════════════════════════════════════════════

  if (!clerkingNote || !activeNoteId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Stethoscope className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Clerking</h1>
            <p className="text-sm text-slate-600">Quick patient documentation</p>
          </div>
          <button onClick={handleStart} disabled={isSaving} className={clsx('w-full btn-primary py-3 flex items-center justify-center gap-2', isSaving && 'loading-pulse')}>
            <Plus className="w-5 h-5" />
            {isSaving ? 'Starting...' : 'Start Clerking'}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN FORM
  // ═══════════════════════════════════════════════════════════════════════════

  const history: any = clerkingNote.history || {};
  const exam: any = clerkingNote.examination || {};
  const vitals: any = exam.vitals || {};
  const _inv: any = clerkingNote.investigations || {};
  const plan: any = clerkingNote.plan || {};
  const safety: any = clerkingNote.safety || {};
  const problemList = clerkingNote.problemList || [];

  const selectedPatient = patients.find((p) => p.id === clerkingNote.patientId);

  // PHASE 3: Calculate completion percentage
  const calculateCompletion = (): number => {
    let completed = 0;
    const total = 8;
    if (clerkingNote.patientId && clerkingNote.patientId !== 'unassigned') completed++;
    if (clerkingNote.presentingComplaint) completed++;
    if (clerkingNote.workingDiagnosis) completed++;
    if (vitals.heartRate || vitals.bloodPressureSystolic) completed++;
    if (history.historyOfPresentingIllness) completed++;
    if (exam.systemsNote) completed++;
    if (plan.managementPlan) completed++;
    if (safety.codeStatus) completed++;
    return Math.round((completed / total) * 100);
  };

  // PHASE 3: Check if minimum required fields are complete for quick save
  const isQuickSaveReady = !!(
    clerkingNote.patientId &&
    clerkingNote.patientId !== 'unassigned' &&
    clerkingNote.presentingComplaint &&
    clerkingNote.workingDiagnosis &&
    (vitals.heartRate || vitals.bloodPressureSystolic)
  );

  const completionPercentage = calculateCompletion();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            <h1 className="font-semibold text-slate-900">Clerking</h1>
            {lastSaved && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDiscard} className="btn-secondary text-xs md:text-sm px-2 md:px-3 py-1.5">
              Discard
            </button>
            <button onClick={handleSaveToOnCall} disabled={isSaving} className={clsx('btn-primary text-xs md:text-sm px-2 md:px-4 py-1.5 flex items-center gap-1 md:gap-2', isSaving && 'loading-pulse')}>
              <Send className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Save to </span>On-Call
            </button>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* PHASE 3: Progress Tracker */}
        <ClerkingProgress
          startTime={startTime}
          targetSeconds={60}
          completionPercentage={completionPercentage}
        />

        {/* Patient */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Patient</h2>
            <button onClick={() => setShowNewPatientDialog(true)} className="text-blue-600 hover:text-blue-700 text-sm">
              {clerkingNote.patientId === 'unassigned' ? 'Add' : 'Change'}
            </button>
          </div>
          {clerkingNote.patientId === 'unassigned' ? (
            <div className="text-center py-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">No patient assigned</p>
              <button onClick={() => setShowNewPatientDialog(true)} className="btn-secondary text-xs inline-flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />
                Add Patient
              </button>
            </div>
          ) : selectedPatient ? (
            <div className="text-sm">
              <p className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
              <p className="text-slate-600">MRN: {selectedPatient.mrn} • Bed: {selectedPatient.bedNumber}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Patient not found</p>
          )}
        </div>

        {/* Overview */}
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-slate-900">Overview</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input type="text" value={clerkingNote.location || ''} onChange={(e) => update({ location: e.target.value })} placeholder="ED Bed 12" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Presenting Complaint</label>
            <textarea value={clerkingNote.presentingComplaint || ''} onChange={(e) => update({ presentingComplaint: e.target.value })} placeholder="Chief complaint..." className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Working Diagnosis</label>
            <input type="text" value={clerkingNote.workingDiagnosis || ''} onChange={(e) => update({ workingDiagnosis: e.target.value })} placeholder="e.g., Pneumonia" className="input-field" />
          </div>
        </div>

        {/* PHASE 3: History (Collapsible - Optional) */}
        <ClerkingSection
          title="History"
          icon={<FileText className="w-5 h-5" />}
          isRequired={false}
          isComplete={!!(history.historyOfPresentingIllness && history.pastMedicalHistory?.length)}
          defaultExpanded={false}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">History of Presenting Illness</label>
              <textarea value={history.historyOfPresentingIllness || ''} onChange={(e) => update({ history: { ...history, historyOfPresentingIllness: e.target.value } })} placeholder="SOCRATES / detailed history..." className="input-field" rows={4} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Past Medical History</label>
              <textarea value={history.pastMedicalHistory?.join('\n') || ''} onChange={(e) => update({ history: { ...history, pastMedicalHistory: e.target.value.split('\n').filter((s: string) => s.trim()) } })} placeholder="One per line..." className="input-field" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Medications</label>
              <div className="space-y-2">
                {history.medications?.map((med: Medication, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
                    <Pill className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="flex-1">{med.name} {med.dose} {med.frequency}</span>
                    <button onClick={() => update({ history: { ...history, medications: history.medications?.filter((_: any, idx: number) => idx !== i) } })} className="text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <AddMedicationRow history={history} update={update} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Allergies</label>
              <div className="space-y-2">
                {history.allergies?.map((allergy: Allergy, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm border border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="flex-1">{allergy.substance} → {allergy.reaction}</span>
                    <button onClick={() => update({ history: { ...history, allergies: history.allergies?.filter((_: any, idx: number) => idx !== i) } })} className="text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <AddAllergyRow history={history} update={update} />
              </div>
            </div>
          </div>
        </ClerkingSection>

        {/* PHASE 3: Examination (Collapsible - Optional for detailed findings) */}
        <ClerkingSection
          title="Examination & Vitals"
          icon={<Activity className="w-5 h-5" />}
          isRequired={false}
          isComplete={!!(vitals.heartRate && vitals.bloodPressureSystolic && exam.systemsNote)}
          defaultExpanded={true}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">HR (bpm)</label>
                <input type="number" value={vitals.heartRate || ''} onChange={(e) => update({ examination: { ...exam, vitals: { ...vitals, heartRate: Number(e.target.value), timestamp: new Date() } } as any })} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">BP Sys</label>
                <input type="number" value={vitals.bloodPressureSystolic || ''} onChange={(e) => update({ examination: { ...exam, vitals: { ...vitals, bloodPressureSystolic: Number(e.target.value), timestamp: new Date() } } as any })} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">BP Dia</label>
                <input type="number" value={vitals.bloodPressureDiastolic || ''} onChange={(e) => update({ examination: { ...exam, vitals: { ...vitals, bloodPressureDiastolic: Number(e.target.value), timestamp: new Date() } } as any })} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">RR</label>
                <input type="number" value={vitals.respiratoryRate || ''} onChange={(e) => update({ examination: { ...exam, vitals: { ...vitals, respiratoryRate: Number(e.target.value), timestamp: new Date() } } as any })} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Temp (°C)</label>
                <input type="number" step="0.1" value={vitals.temperature || ''} onChange={(e) => update({ examination: { ...exam, vitals: { ...vitals, temperature: Number(e.target.value), timestamp: new Date() } } as any })} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">SpO2 (%)</label>
                <input type="number" value={vitals.oxygenSaturation || ''} onChange={(e) => update({ examination: { ...exam, vitals: { ...vitals, oxygenSaturation: Number(e.target.value), timestamp: new Date() } } as any })} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Examination Findings</label>
              <textarea value={(exam.systemsNote as string) || ''} onChange={(e) => update({ examination: { ...exam, systemsNote: e.target.value } as any })} placeholder="General appearance, systems examination..." className="input-field" rows={4} />
            </div>
          </div>
        </ClerkingSection>

        {/* PHASE 3: Assessment (Collapsible - Optional) */}
        <ClerkingSection
          title="Assessment & Problem List"
          icon={<Target className="w-5 h-5" />}
          isRequired={false}
          isComplete={problemList.length > 0}
          defaultExpanded={false}
        >
          <div className="space-y-2">
            {problemList.map((problem: ProblemListItem, i: number) => (
              <div key={problem.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium mr-2', problem.severity === 'critical' && 'bg-red-100 text-red-700', problem.severity === 'high' && 'bg-orange-100 text-orange-700', problem.severity === 'medium' && 'bg-yellow-100 text-yellow-700', problem.severity === 'low' && 'bg-green-100 text-green-700')}>
                      {problem.severity}
                    </span>
                    <strong className="text-sm">{problem.title}</strong>
                  </div>
                  <button onClick={() => update({ problemList: problemList.filter((_: any, idx: number) => idx !== i) })} className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <AddProblemRow problemList={problemList} update={update} />
          </div>
        </ClerkingSection>

        {/* Plan */}
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-slate-900">Plan</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Management Plan</label>
            <textarea value={plan.managementPlan || ''} onChange={(e) => update({ plan: { ...plan, managementPlan: e.target.value } as any })} placeholder="Treatment, medications, interventions..." className="input-field" rows={4} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Disposition</label>
            <input type="text" value={plan.disposition || ''} onChange={(e) => update({ plan: { ...plan, disposition: e.target.value } as any })} placeholder="Admit / Discharge / Observation..." className="input-field" />
          </div>
        </div>

        {/* Safety */}
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-slate-900">Safety</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Code Status</label>
            <select value={safety.codeStatus || ''} onChange={(e) => update({ safety: { ...safety, codeStatus: e.target.value } as any })} className="input-field">
              <option value="">Select...</option>
              <option value="Full Code">Full Code</option>
              <option value="DNR">DNR</option>
              <option value="DNI">DNI</option>
              <option value="Comfort Care">Comfort Care</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">VTE Prophylaxis</label>
            <input type="text" value={safety.vteProph?.reason || ''} onChange={(e) => update({ safety: { ...safety, vteProph: { considered: true, reason: e.target.value } } as any })} placeholder="Enoxaparin 40mg SC daily..." className="input-field" />
          </div>
        </div>
      </div>

      {/* PHASE 3: Quick Save Floating Button */}
      <ClerkingQuickSave
        isVisible={isQuickSaveReady && !isSaving}
        onQuickSave={handleQuickSave}
        isSaving={isSaving}
        completionPercentage={completionPercentage}
      />

      {/* Patient Dialog */}
      {showNewPatientDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Add Patient</h2>
              <button onClick={() => setShowNewPatientDialog(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Existing</label>
                <select
                  value={clerkingNote.patientId === 'unassigned' ? '' : clerkingNote.patientId}
                  onChange={(e) => {
                    update({ patientId: e.target.value || 'unassigned' });
                    setShowNewPatientDialog(false);
                  }}
                  className="input-field"
                >
                  <option value="">Select...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} - {p.mrn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs text-slate-500 mb-3 text-center">Or create new</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={newPatientData.firstName} onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value })} placeholder="First Name *" className="input-field" />
                  <input type="text" value={newPatientData.lastName} onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value })} placeholder="Last Name *" className="input-field" />
                </div>
                <input type="date" value={newPatientData.dateOfBirth} onChange={(e) => setNewPatientData({ ...newPatientData, dateOfBirth: e.target.value })} className="input-field mt-3" />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <input type="text" value={newPatientData.mrn} onChange={(e) => setNewPatientData({ ...newPatientData, mrn: e.target.value })} placeholder="MRN" className="input-field" />
                  <input type="text" value={newPatientData.bedNumber} onChange={(e) => setNewPatientData({ ...newPatientData, bedNumber: e.target.value })} placeholder="Bed" className="input-field" />
                </div>
                <button onClick={handleCreatePatient} disabled={isSaving || !newPatientData.firstName || !newPatientData.lastName} className={clsx('btn-primary w-full mt-4', isSaving && 'loading-pulse')}>
                  {isSaving ? 'Creating...' : 'Create & Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 1: Safety Validation Modal */}
      {safetyValidation && (
        <SafetyValidationModal
          isOpen={showSafetyModal}
          validationResult={safetyValidation}
          onClose={() => setShowSafetyModal(false)}
          onProceed={safetyValidation.canProceed ? performSaveToOnCall : undefined}
          title="Clerking Note Safety Validation"
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function AddMedicationRow({ history, update }: any) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');

  function add() {
    if (!name.trim()) return;
    const medications = [...(history.medications || []), { name, dose, frequency: '', route: 'PO' }];
    update({ history: { ...history, medications } });
    setName('');
    setDose('');
  }

  return (
    <div className="flex gap-2">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Medication" className="input-field flex-1" />
      <input type="text" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dose" className="input-field w-24" />
      <button onClick={add} className="btn-secondary px-3">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

function AddAllergyRow({ history, update }: any) {
  const [substance, setSubstance] = useState('');
  const [reaction, setReaction] = useState('');

  function add() {
    if (!substance.trim()) return;
    const allergies = [...(history.allergies || []), { substance, reaction, severity: 'mild' as const, type: 'drug' as const }];
    update({ history: { ...history, allergies } });
    setSubstance('');
    setReaction('');
  }

  return (
    <div className="flex gap-2">
      <input type="text" value={substance} onChange={(e) => setSubstance(e.target.value)} placeholder="Allergen" className="input-field flex-1" />
      <input type="text" value={reaction} onChange={(e) => setReaction(e.target.value)} placeholder="Reaction" className="input-field flex-1" />
      <button onClick={add} className="btn-secondary px-3">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

function AddProblemRow({ problemList, update }: any) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  function add() {
    if (!title.trim()) return;
    const updated: ProblemListItem[] = [
      ...problemList,
      {
        id: Date.now().toString(),
        title,
        evidence: [],
        severity,
        plan: [],
        tasks: [],
        isActive: true,
      },
    ];
    update({ problemList: updated });
    setTitle('');
    setSeverity('medium');
  }

  return (
    <div className="flex gap-2">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Problem / Diagnosis" className="input-field flex-1" />
      <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="input-field w-28">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>
      <button onClick={add} className="btn-primary px-3">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { clsx } from 'clsx';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Save,
  Pen,
  Activity,
  Beaker,
  ClipboardList,
  Shield,
  Stethoscope,
} from 'lucide-react';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import {
  createClerkingNote,
  updateClerkingNote,
  finalizeClerkingWorkflow,
} from '@/services/firebase/clerkingNotes';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type {
  HistoryData,
  SectionStatus,
  ExaminationData,
  VitalSigns,
  InvestigationsData,
  PlanData,
  SafetyChecklist,
  Priority,
  Medication,
} from '@/types/clerking';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { MedicationEntry } from '@/components/clerking/MedicationEntry';
import { ScanNotesButton, type ClinicalExtractionResponse } from '@/components/clerking/ScanNotesButton';

type StepKey = 'history' | 'examination' | 'investigations' | 'assessment' | 'plan' | 'safety';

interface StepConfig {
  key: StepKey;
  label: string;
  icon: typeof Activity;
}

const steps: StepConfig[] = [
  { key: 'history', label: 'History', icon: FileText },
  { key: 'examination', label: 'Examination', icon: Stethoscope },
  { key: 'investigations', label: 'Investigations', icon: Beaker },
  { key: 'assessment', label: 'Assessment', icon: Activity },
  { key: 'plan', label: 'Plan', icon: ClipboardList },
  { key: 'safety', label: 'Safety', icon: Shield },
];

function getStatusColor(status: SectionStatus): string {
  switch (status) {
    case 'complete': return 'bg-green-500';
    case 'warning': return 'bg-amber-500';
    case 'incomplete': return 'bg-slate-300';
    default: return 'bg-slate-300';
  }
}

const CRITICAL_PROBLEM_KEYWORDS = [
  'sepsis',
  'septic shock',
  'stemi',
  'cardiac arrest',
  'respiratory failure',
  'anaphylaxis',
  'hyperkalaemia',
  'hyperkalemia',
  'dka',
  'stroke',
  'massive pe',
];

const HIGH_PROBLEM_KEYWORDS = [
  'acs',
  'chest pain',
  'pneumonia',
  'aki',
  'pulmonary embolism',
  'pe',
  'hypoxia',
  'hypotension',
];

function inferProblemSeverity(title: string): Priority {
  const normalized = title.toLowerCase();
  if (CRITICAL_PROBLEM_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'critical';
  if (HIGH_PROBLEM_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'high';
  return 'medium';
}

function parseProblemListInput(input: string): Array<{ id: string; title: string; severity: Priority }> {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((rawLine, index) => {
    const strippedNumbering = rawLine.replace(/^\d+[).\-\s]+/, '').trim();

    // Supports: [critical] Sepsis OR critical: Sepsis
    const bracketPrefix = strippedNumbering.match(/^\[(critical|high|medium|low)\]\s*(.+)$/i);
    const labelPrefix = strippedNumbering.match(/^(critical|high|medium|low)\s*[:-]\s*(.+)$/i);

    let severity: Priority;
    let title: string;

    if (bracketPrefix) {
      severity = bracketPrefix[1].toLowerCase() as Priority;
      title = bracketPrefix[2].trim();
    } else if (labelPrefix) {
      severity = labelPrefix[1].toLowerCase() as Priority;
      title = labelPrefix[2].trim();
    } else if (strippedNumbering.startsWith('!!!')) {
      severity = 'critical';
      title = strippedNumbering.replace(/^!+/, '').trim();
    } else if (strippedNumbering.startsWith('!')) {
      severity = 'high';
      title = strippedNumbering.replace(/^!+/, '').trim();
    } else {
      title = strippedNumbering;
      severity = inferProblemSeverity(title);
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return {
      id: `problem-${index}-${slug || index}`,
      title,
      severity,
    };
  });
}

function createTemporaryPatientId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `temp:${Date.now()}:${slug || 'external-case'}`;
}

export default function ClerkingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const patients = usePatientStore((s) => s.patients);
  const [searchParams] = useSearchParams();
  const prefillAppliedRef = useRef(false);

  const [patientMode, setPatientMode] = useState<'existing' | 'temporary'>('existing');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [temporaryPatientId, setTemporaryPatientId] = useState('');
  const [temporaryPatientName, setTemporaryPatientName] = useState('');
  const [temporaryLocation, setTemporaryLocation] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showMoreHistory, setShowMoreHistory] = useState(false);
  const [showSystemExam, setShowSystemExam] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to always point at the latest performSave — avoids stale closure in auto-save timer
  const performSaveRef = useRef<() => Promise<void>>(async () => {});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<StepKey>>(new Set(['history']));
  const [error, setError] = useState<string | null>(null);
  const [workflowNotice, setWorkflowNotice] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  // Form state for each section
  const [presentingComplaint, setPresentingComplaint] = useState('');
  const [workingDiagnosis, setWorkingDiagnosis] = useState('');
  const [location, setLocation] = useState('');

  // History section
  const [hpi, setHpi] = useState('');
  const [pmh, setPmh] = useState('');
  const [psh, setPsh] = useState('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [socialHistory, setSocialHistory] = useState('');
  const [systemsReview, setSystemsReview] = useState('');

  // Examination section
  const [generalAppearance, setGeneralAppearance] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [oxygenSat, setOxygenSat] = useState('');
  const [cardiovascularExam, setCardiovascularExam] = useState('');
  const [respiratoryExam, setRespiratoryExam] = useState('');
  const [abdominalExam, setAbdominalExam] = useState('');
  const [neurologicalExam, setNeurologicalExam] = useState('');

  // Investigations section
  const [investigationsNotes, setInvestigationsNotes] = useState('');
  const [pendingResults, setPendingResults] = useState('');

  // Assessment section
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [problemList, setProblemList] = useState('');

  // Plan section
  const [managementPlan, setManagementPlan] = useState('');
  const [disposition, setDisposition] = useState('');
  const [monitoringPlan, setMonitoringPlan] = useState('');

  // Safety section
  const [vteConsidered, setVteConsidered] = useState(false);
  const [giProphIndicated, setGiProphIndicated] = useState(false);
  const [linesReviewed, setLinesReviewed] = useState(false);
  const [fallsRisk, setFallsRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [pressureRisk, setPressureRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [safetyNotes, setSafetyNotes] = useState('');

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );
  const isTemporaryCase = patientMode === 'temporary';

  const currentPatientIdentity = useMemo(() => {
    if (isTemporaryCase) {
      const name = temporaryPatientName.trim() || 'Temporary';
      return {
        id: temporaryPatientId,
        firstName: name,
        lastName: '',
        bedNumber: temporaryLocation.trim() || 'On-call',
      };
    }

    if (!selectedPatient) return null;
    return {
      id: selectedPatient.id,
      firstName: selectedPatient.firstName,
      lastName: selectedPatient.lastName,
      bedNumber: selectedPatient.bedNumber,
    };
  }, [isTemporaryCase, temporaryPatientId, temporaryPatientName, temporaryLocation, selectedPatient]);

  // Compute section statuses
  const sectionStatus = useMemo((): Record<StepKey, SectionStatus> => {
    return {
      history: hpi || pmh || medications.length > 0 ? (hpi ? 'complete' : 'warning') : 'incomplete',
      examination: generalAppearance || heartRate ? (generalAppearance && heartRate ? 'complete' : 'warning') : 'incomplete',
      investigations: investigationsNotes ? 'complete' : 'incomplete',
      assessment: assessmentNotes || problemList ? (assessmentNotes ? 'complete' : 'warning') : 'incomplete',
      plan: managementPlan ? 'complete' : 'incomplete',
      safety: vteConsidered ? 'complete' : 'incomplete',
    };
  }, [hpi, pmh, medications, generalAppearance, heartRate, investigationsNotes, assessmentNotes, problemList, managementPlan, vteConsidered]);

  // Compute completion percentage
  const completionPercentage = useMemo(() => {
    const completedCount = Object.values(sectionStatus).filter((s) => s === 'complete').length;
    return Math.round((completedCount / 6) * 100);
  }, [sectionStatus]);

  // Create note on patient selection
  async function handlePatientSelect(patientId: string) {
    setPatientMode('existing');
    setSelectedPatientId(patientId);
    setTemporaryPatientId('');
    setTemporaryPatientName('');
    setTemporaryLocation('');
    setError(null);
    setWorkflowNotice(null);
  }

  async function handleExistingStart() {
    if (!selectedPatientId || !user) return;
    prefillAppliedRef.current = true;

    try {
      const id = await createClerkingNote(user.id, user.displayName, selectedPatientId, {
        location,
        workingDiagnosis,
        presentingComplaint,
      });
      setNoteId(id);
    } catch (err) {
      console.error('Error creating clerking note:', err);
      setError('Failed to create clerking note.');
    }
  }

  async function handleTemporaryStart() {
    if (!user) return;

    const name = temporaryPatientName.trim();
    if (!name) {
      setError('Enter a temporary patient name before starting clerking.');
      return;
    }
    prefillAppliedRef.current = true;

    const generatedId = createTemporaryPatientId(name);
    setPatientMode('temporary');
    setSelectedPatientId('');
    setTemporaryPatientId(generatedId);
    setError(null);
    setWorkflowNotice(null);

    try {
      const id = await createClerkingNote(user.id, user.displayName, generatedId, {
        location: temporaryLocation || location,
        workingDiagnosis,
        presentingComplaint,
      });
      if (!location && temporaryLocation) setLocation(temporaryLocation);
      setNoteId(id);
    } catch (err) {
      console.error('Error creating temporary clerking note:', err);
      setError('Failed to start temporary clerking note.');
    }
  }

  useEffect(() => {
    if (prefillAppliedRef.current || !user || noteId) return;

    const patientIdParam = searchParams.get('patientId')?.trim();
    if (patientIdParam) {
      const matchedPatient = patients.find((patient) => patient.id === patientIdParam);
      if (matchedPatient) {
        prefillAppliedRef.current = true;
        setPatientMode('existing');
        setSelectedPatientId(patientIdParam);
        setTemporaryPatientId('');
        setTemporaryPatientName('');
        setTemporaryLocation('');
        setError(null);
        setWorkflowNotice(null);

        void createClerkingNote(user.id, user.displayName, patientIdParam, {
          location,
          workingDiagnosis,
          presentingComplaint,
        })
          .then((createdId) => setNoteId(createdId))
          .catch((err) => {
            console.error('Error creating prefilled clerking note:', err);
            setError('Failed to create clerking note.');
          });
        return;
      }
    }

    const tempNameParam = searchParams.get('tempName')?.trim();
    if (!tempNameParam) return;

    prefillAppliedRef.current = true;
    const tempWardParam = searchParams.get('tempWard')?.trim() || '';
    const tempBedParam = searchParams.get('tempBed')?.trim() || '';
    const tempReason = searchParams.get('reason')?.trim() || '';
    const builtLocation = [tempWardParam, tempBedParam ? `Bed ${tempBedParam}` : '']
      .filter(Boolean)
      .join(' · ');
    const generatedId = createTemporaryPatientId(tempNameParam);

    setPatientMode('temporary');
    setSelectedPatientId('');
    setTemporaryPatientId(generatedId);
    setTemporaryPatientName(tempNameParam);
    setTemporaryLocation(builtLocation);
    if (builtLocation) setLocation((prev) => prev || builtLocation);
    if (tempReason) setPresentingComplaint((prev) => prev || tempReason);
    setError(null);
    setWorkflowNotice(null);

    void createClerkingNote(user.id, user.displayName, generatedId, {
      location: builtLocation || location,
      workingDiagnosis,
      presentingComplaint: tempReason || presentingComplaint,
    })
      .then((createdId) => setNoteId(createdId))
      .catch((err) => {
        console.error('Error creating prefilled temporary clerking note:', err);
        setError('Failed to create temporary clerking note.');
      });
  }, [searchParams, patients, user, noteId, location, workingDiagnosis, presentingComplaint]);

  // Debounced auto-save — calls via ref to avoid stale closure over form state
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (noteId) {
        void performSaveRef.current();
      }
    }, 3000);
  }, [noteId]);

  // Trigger auto-save on any field change
  useEffect(() => {
    if (noteId) {
      triggerAutoSave();
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    noteId, triggerAutoSave,
    hpi, pmh, psh, medications, allergies, familyHistory, socialHistory, systemsReview,
    generalAppearance, heartRate, bloodPressure, respiratoryRate, temperature, oxygenSat,
    cardiovascularExam, respiratoryExam, abdominalExam, neurologicalExam,
    investigationsNotes, pendingResults, assessmentNotes, problemList,
    managementPlan, disposition, monitoringPlan,
    vteConsidered, giProphIndicated, linesReviewed, fallsRisk, pressureRisk, safetyNotes,
    presentingComplaint, workingDiagnosis, location,
  ]);

  async function performSave() {
    if (!noteId) return;
    setSaving(true);
    try {
      // Parse BP string "120/80" into systolic/diastolic
      const bpParts = bloodPressure.split('/');
      const bpSys = bpParts[0] ? parseInt(bpParts[0], 10) : NaN;
      const bpDia = bpParts[1] ? parseInt(bpParts[1], 10) : NaN;

      // Build vitals without undefined fields — Firestore rejects undefined
      const vitals: VitalSigns = { timestamp: new Date() };
      if (heartRate) vitals.heartRate = parseInt(heartRate, 10);
      if (!isNaN(bpSys)) vitals.bloodPressureSystolic = bpSys;
      if (!isNaN(bpDia)) vitals.bloodPressureDiastolic = bpDia;
      if (respiratoryRate) vitals.respiratoryRate = parseInt(respiratoryRate, 10);
      if (temperature) vitals.temperature = parseFloat(temperature);
      if (oxygenSat) vitals.oxygenSaturation = parseFloat(oxygenSat);
      const parsedProblems = parseProblemListInput(problemList);

      await updateClerkingNote(noteId, {
        presentingComplaint,
        workingDiagnosis,
        location,
        history: {
          historyOfPresentingIllness: hpi,
          pastMedicalHistory: pmh.split('\n').filter(Boolean),
          pastSurgicalHistory: psh.split('\n').filter(Boolean),
          medications: medications,
          allergies: allergies.split('\n').filter(Boolean).map((line) => ({
            substance: line.trim(), reaction: 'unknown', severity: 'mild' as const, type: 'drug' as const,
          })),
          familyHistory,
          socialHistory: { occupation: socialHistory },
          systemsReview: { constitutional: systemsReview },
        } as Partial<HistoryData>,
        examination: {
          general: {
            appearance: generalAppearance,
            distress: false,
            hydration: '',
            pallor: false,
            jaundice: false,
            cyanosis: false,
          },
          vitals,
          cardiovascular: { findings: cardiovascularExam, isNormal: !cardiovascularExam },
          respiratory: { findings: respiratoryExam, isNormal: !respiratoryExam },
          abdominal: { findings: abdominalExam, isNormal: !abdominalExam },
          neurological: { findings: neurologicalExam, isNormal: !neurologicalExam },
        } as Partial<ExaminationData>,
        investigations: {
          labs: [],
          imaging: [],
          microbiology: [],
          notes: investigationsNotes,
          pendingResults: pendingResults.split('\n').filter(Boolean),
        } as Partial<InvestigationsData>,
        assessmentSummary: assessmentNotes,
        problemList: parsedProblems.map((problem) => ({
          id: problem.id,
          title: problem.title,
          evidence: [],
          severity: problem.severity,
          plan: [],
          tasks: [],
          isActive: true,
        })),
        plan: {
          managementPlan,
          disposition,
          monitoring: {
            vitalsFrequency: monitoringPlan,
            neuroObservations: false,
            fluidBalance: false,
            urineOutput: false,
            escalationTriggers: [],
          },
          fluids: {},
          medications: [],
          investigations: [],
          consults: [],
          tasks: [],
        } as Partial<PlanData>,
        safety: {
          vteProph: { considered: vteConsidered },
          giProph: { indicated: giProphIndicated },
          linesReview: { done: linesReviewed },
          fallsRisk: { risk: fallsRisk },
          pressureInjury: { risk: pressureRisk },
          sepsisSix: { applicable: false },
          other: safetyNotes ? [safetyNotes] : [],
        } as Partial<SafetyChecklist>,
        sectionStatus,
        completionPercentage,
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      setSaving(false);
    }
  }

  // Keep ref pointing at the latest performSave after every render
  // This prevents the stale closure in the auto-save timer
  useEffect(() => {
    performSaveRef.current = performSave;
  });

  async function handleManualSave() {
    await performSave();
  }

  function resetForm() {
    setPatientMode('existing');
    setPresentingComplaint('');
    setWorkingDiagnosis('');
    setLocation('');
    setHpi('');
    setPmh('');
    setPsh('');
    setMedications([]);
    setAllergies('');
    setFamilyHistory('');
    setSocialHistory('');
    setSystemsReview('');
    setGeneralAppearance('');
    setHeartRate('');
    setBloodPressure('');
    setRespiratoryRate('');
    setTemperature('');
    setOxygenSat('');
    setCardiovascularExam('');
    setRespiratoryExam('');
    setAbdominalExam('');
    setNeurologicalExam('');
    setInvestigationsNotes('');
    setPendingResults('');
    setAssessmentNotes('');
    setProblemList('');
    setManagementPlan('');
    setDisposition('');
    setMonitoringPlan('');
    setVteConsidered(false);
    setGiProphIndicated(false);
    setLinesReviewed(false);
    setFallsRisk('low');
    setPressureRisk('low');
    setSafetyNotes('');
    setNoteId(null);
    setSelectedPatientId('');
    setTemporaryPatientId('');
    setTemporaryPatientName('');
    setTemporaryLocation('');
  }

  function handleScanResult(data: ClinicalExtractionResponse, acceptedFields: Set<string>) {
    // --- Top-level fields ---
    if (acceptedFields.has('presentingComplaint') && data.presentingComplaint) {
      setPresentingComplaint((prev) => prev ? `${prev}; ${data.presentingComplaint}` : data.presentingComplaint!);
    }

    // --- History fields ---
    if (acceptedFields.has('historyOfPresentingIllness') && data.historyOfPresentingIllness) {
      setHpi((prev) => prev ? `${prev}\n\n${data.historyOfPresentingIllness}` : data.historyOfPresentingIllness);
    }
    if (acceptedFields.has('pastMedicalHistory') && data.pastMedicalHistory.length > 0) {
      setPmh((prev) => {
        const existing = prev.split('\n').filter(Boolean).map((s) => s.trim().toLowerCase());
        const newItems = data.pastMedicalHistory.filter(
          (item) => !existing.includes(item.trim().toLowerCase())
        );
        return [...prev.split('\n').filter(Boolean), ...newItems].join('\n');
      });
    }
    if (acceptedFields.has('pastSurgicalHistory') && data.pastSurgicalHistory.length > 0) {
      setPsh((prev) => {
        const existing = prev.split('\n').filter(Boolean).map((s) => s.trim().toLowerCase());
        const newItems = data.pastSurgicalHistory.filter(
          (item) => !existing.includes(item.trim().toLowerCase())
        );
        return [...prev.split('\n').filter(Boolean), ...newItems].join('\n');
      });
    }
    if (acceptedFields.has('medications') && data.medications.length > 0) {
      setMedications((prev) => {
        const existingNames = prev.map((m) => m.name.trim().toLowerCase());
        const newMeds = data.medications
          .filter((m) => !existingNames.includes(m.name.trim().toLowerCase()))
          .map((m) => ({ ...m, isHighRisk: false }));
        return [...prev, ...newMeds];
      });
    }
    if (acceptedFields.has('allergies') && data.allergies.length > 0) {
      setAllergies((prev) => {
        const existing = prev.split('\n').filter(Boolean).map((s) => s.trim().toLowerCase());
        const newItems = data.allergies
          .filter((a) => !existing.some((e) => e.includes(a.substance.toLowerCase())))
          .map((a) => `${a.substance} (${a.reaction})`);
        return [...prev.split('\n').filter(Boolean), ...newItems].join('\n');
      });
    }
    if (acceptedFields.has('familyHistory') && data.familyHistory) {
      setFamilyHistory((prev) => prev ? `${prev}\n${data.familyHistory}` : data.familyHistory);
    }
    if (acceptedFields.has('socialHistory')) {
      const parts: string[] = [];
      if (data.socialHistory.occupation) parts.push(`Occupation: ${data.socialHistory.occupation}`);
      if (data.socialHistory.smoking) parts.push(`Smoking: ${data.socialHistory.smoking}`);
      if (data.socialHistory.alcohol) parts.push(`Alcohol: ${data.socialHistory.alcohol}`);
      if (data.socialHistory.illicitDrugs) parts.push(`Drugs: ${data.socialHistory.illicitDrugs}`);
      if (data.socialHistory.living) parts.push(`Living: ${data.socialHistory.living}`);
      if (data.socialHistory.functionalStatus) parts.push(`Function: ${data.socialHistory.functionalStatus}`);
      if (parts.length > 0) {
        setSocialHistory((prev) => prev ? `${prev}\n${parts.join('\n')}` : parts.join('\n'));
      }
    }
    if (acceptedFields.has('systemsReview') && data.systemsReview) {
      setSystemsReview((prev) => prev ? `${prev}\n${data.systemsReview}` : data.systemsReview);
    }

    // --- Examination fields ---
    if (acceptedFields.has('generalAppearance') && data.examination?.generalAppearance) {
      setGeneralAppearance((prev) => prev ? `${prev}; ${data.examination.generalAppearance}` : data.examination.generalAppearance!);
    }
    if (acceptedFields.has('vitals')) {
      const exam = data.examination;
      if (exam?.heartRate) setHeartRate((prev) => prev || exam.heartRate!);
      if (exam?.bloodPressure) setBloodPressure((prev) => prev || exam.bloodPressure!);
      if (exam?.respiratoryRate) setRespiratoryRate((prev) => prev || exam.respiratoryRate!);
      if (exam?.temperature) setTemperature((prev) => prev || exam.temperature!);
      if (exam?.oxygenSaturation) setOxygenSat((prev) => prev || exam.oxygenSaturation!);
    }
    if (acceptedFields.has('systemExams')) {
      const exam = data.examination;
      if (exam?.cardiovascular) setCardiovascularExam((prev) => prev ? `${prev}\n${exam.cardiovascular}` : exam.cardiovascular!);
      if (exam?.respiratory) setRespiratoryExam((prev) => prev ? `${prev}\n${exam.respiratory}` : exam.respiratory!);
      if (exam?.abdominal) setAbdominalExam((prev) => prev ? `${prev}\n${exam.abdominal}` : exam.abdominal!);
      if (exam?.neurological) setNeurologicalExam((prev) => prev ? `${prev}\n${exam.neurological}` : exam.neurological!);
      setShowSystemExam(true);
    }

    // --- Investigations fields ---
    if (acceptedFields.has('investigationsNotes') && data.investigations?.notes) {
      setInvestigationsNotes((prev) => prev ? `${prev}\n\n${data.investigations.notes}` : data.investigations.notes);
    }
    if (acceptedFields.has('pendingResults') && (data.investigations?.pendingResults || []).length > 0) {
      setPendingResults((prev) => {
        const existing = prev.split('\n').filter(Boolean).map((s) => s.trim().toLowerCase());
        const newItems = data.investigations.pendingResults.filter(
          (item) => !existing.includes(item.trim().toLowerCase())
        );
        return [...prev.split('\n').filter(Boolean), ...newItems].join('\n');
      });
    }

    // --- Assessment fields ---
    if (acceptedFields.has('assessment') && data.assessment) {
      setAssessmentNotes((prev) => prev ? `${prev}\n\n${data.assessment}` : data.assessment!);
    }
    if (acceptedFields.has('problemList') && data.problemList) {
      setProblemList((prev) => prev ? `${prev}\n${data.problemList}` : data.problemList!);
    }

    // --- Plan fields ---
    if (acceptedFields.has('managementPlan') && data.plan?.managementPlan) {
      setManagementPlan((prev) => prev ? `${prev}\n\n${data.plan.managementPlan}` : data.plan.managementPlan!);
    }
    if (acceptedFields.has('disposition') && data.plan?.disposition) {
      setDisposition((prev) => prev || data.plan.disposition!);
    }
    if (acceptedFields.has('monitoringPlan') && data.plan?.monitoring) {
      setMonitoringPlan((prev) => prev ? `${prev}\n${data.plan.monitoring}` : data.plan.monitoring!);
    }

    // --- Auto-expand sections that received data ---
    if (
      (acceptedFields.has('pastSurgicalHistory') && data.pastSurgicalHistory.length > 0) ||
      (acceptedFields.has('familyHistory') && data.familyHistory) ||
      (acceptedFields.has('socialHistory')) ||
      (acceptedFields.has('systemsReview') && data.systemsReview)
    ) {
      setShowMoreHistory(true);
    }

    // Expand collapsed sections that received data
    const sectionsToExpand: StepKey[] = [];
    if (acceptedFields.has('generalAppearance') || acceptedFields.has('vitals') || acceptedFields.has('systemExams')) {
      sectionsToExpand.push('examination');
    }
    if (acceptedFields.has('investigationsNotes') || acceptedFields.has('pendingResults')) {
      sectionsToExpand.push('investigations');
    }
    if (acceptedFields.has('assessment') || acceptedFields.has('problemList')) {
      sectionsToExpand.push('assessment');
    }
    if (acceptedFields.has('managementPlan') || acceptedFields.has('disposition') || acceptedFields.has('monitoringPlan')) {
      sectionsToExpand.push('plan');
    }
    if (sectionsToExpand.length > 0) {
      setExpandedSteps((prev) => {
        const next = new Set(prev);
        sectionsToExpand.forEach((key) => next.add(key));
        return next;
      });
    }
  }

  function handleStartNewCase() {
    if (noteId) {
      const confirmed = window.confirm('Start a new clerking case? Unsaved progress in the current note may be lost.')
      if (!confirmed) return
    }
    resetForm()
    setError(null)
    setWorkflowNotice(null)
    setLastSaved(null)
  }

  async function handleSignAndSubmit() {
    if (!noteId || !user || !currentPatientIdentity) return;

    // Save first
    await performSave();

    setSigning(true);
    try {
      const parsedProblems = parseProblemListInput(problemList);
      const shouldEscalateToOnCall = !isTemporaryCase && parsedProblems.some(
        (problem) => problem.severity === 'critical' || problem.severity === 'high'
      );

      const result = await finalizeClerkingWorkflow({
        noteId,
        userId: user.id,
        userName: user.displayName,
        patient: currentPatientIdentity,
        escalateToOnCall: shouldEscalateToOnCall,
        saveSbar: true,
      });

      setError(null);

      const notices: string[] = [];
      notices.push('Clerking note signed.');
      if (result.tasksCreated > 0) {
        notices.push(`Created ${result.tasksCreated} auto-task${result.tasksCreated === 1 ? '' : 's'}.`);
      } else {
        notices.push('No auto-generated tasks were required.');
      }
      if (result.escalated) {
        notices.push('Patient escalated to on-call list.');
      } else if (shouldEscalateToOnCall) {
        notices.push('High-risk case detected but on-call escalation did not complete.');
      } else if (isTemporaryCase) {
        notices.push('Temporary on-call case signed (not added to permanent unit list).');
      }

      // Capture navigation targets BEFORE resetForm clears state
      const wasTemporaryCase = isTemporaryCase;
      const targetPatientId = currentPatientIdentity.id;

      resetForm();

      // Navigate immediately to the patient page
      if (wasTemporaryCase || result.escalated) {
        navigate('/on-call');
      } else {
        navigate(`/patients/${targetPatientId}`);
      }
    } catch (err) {
      console.error('Error signing note:', err);
      setError('Failed to finalize clerking workflow.');
    } finally {
      setSigning(false);
    }
  }

  function toggleStep(key: StepKey) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-ward-bg">
      {/* Header */}
      <div className="bg-ward-card border-b border-ward-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <FileText size={20} className="text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Clerking</h1>
                <p className="text-sm text-slate-500">
                  Structured admission clerking workflow
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {noteId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartNewCase}
                >
                  New case
                </Button>
              )}
              {saving && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Save size={12} className="animate-pulse" />
                  Saving...
                </span>
              )}
              {lastSaved && !saving && (
                <span className="text-xs text-slate-400">
                  Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleManualSave}
                disabled={!noteId || saving}
                iconLeft={<Save size={14} />}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Patient selector */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPatientMode('existing')}
                disabled={Boolean(noteId)}
                className={clsx(
                  'h-9 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                  patientMode === 'existing'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                )}
              >
                Unit patient
              </button>
              <button
                type="button"
                onClick={() => setPatientMode('temporary')}
                disabled={Boolean(noteId)}
                className={clsx(
                  'h-9 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                  patientMode === 'temporary'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                )}
              >
                Temporary on-call
              </button>
            </div>

            {patientMode === 'existing' ? (
              <div className="space-y-2">
                <Select
                  label="Patient"
                  value={selectedPatientId}
                  onChange={(e) => handlePatientSelect(e.target.value)}
                  disabled={Boolean(noteId)}
                >
                  <option value="">Select a patient to clerk...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} - MRN: {p.mrn} - Bed {p.bedNumber}
                    </option>
                  ))}
                </Select>
                {!noteId && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleExistingStart}
                      disabled={!selectedPatientId}
                    >
                      Start clerking
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  label="Temporary patient name"
                  value={temporaryPatientName}
                  onChange={(e) => setTemporaryPatientName(e.target.value)}
                  placeholder="e.g. Unknown male from ED"
                  disabled={Boolean(noteId)}
                />
                <Input
                  label="Location / ward"
                  value={temporaryLocation}
                  onChange={(e) => setTemporaryLocation(e.target.value)}
                  placeholder="e.g. ED Resus Bay 3"
                  disabled={Boolean(noteId)}
                />
                {!noteId && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleTemporaryStart}
                      disabled={!temporaryPatientName.trim()}
                    >
                      Start temporary clerking
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!noteId && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Workflow</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  1) Choose case type, 2) Start clerking, 3) Complete key sections, 4) Sign & submit.
                </p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {noteId && (
            <div className="mt-4">
              <div className="mb-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Case in progress: {isTemporaryCase
                    ? (temporaryPatientName.trim() || 'Temporary on-call case')
                    : (selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Selected patient')}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Finish documentation and use <span className="font-medium">Sign & Submit</span> to complete workflow.
                </p>
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-500">Progress</span>
                <span className="text-xs font-semibold text-slate-700">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={clsx(
                    'h-2 rounded-full transition-all duration-500',
                    completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500',
                  )}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {/* Step indicators */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {steps.map((step) => (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => toggleStep(step.key)}
                    className={clsx(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                      expandedSteps.has(step.key)
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    )}
                  >
                    <span className={clsx('w-2 h-2 rounded-full', getStatusColor(sectionStatus[step.key]))} />
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {workflowNotice && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div
            className={clsx(
              'p-3 rounded-lg border',
              workflowNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            )}
          >
            <p className="text-sm">{workflowNotice.text}</p>
          </div>
        </div>
      )}

      {!noteId ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <div className="text-center py-12">
              <FileText size={40} className="mx-auto text-slate-300 mb-3" />
              <h2 className="text-lg font-semibold text-slate-900">
                {patientMode === 'temporary'
                  ? 'Start a temporary on-call clerking note'
                  : 'Select a patient to begin clerking'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {patientMode === 'temporary'
                  ? 'Use the temporary fields above for external/non-unit cases.'
                  : 'Choose a patient from the dropdown above to start a new clerking note.'}
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {/* Scan clinical notes — top-level so it populates all sections */}
          <Card padding="md" className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick data entry</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Photograph a referral letter, clinical notes, or lab report and AI will fill the relevant sections.
                </p>
              </div>
              <ScanNotesButton onExtracted={handleScanResult} />
            </div>
          </Card>

          {/* Basic info */}
          <Card padding="md">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Presenting Complaint"
                value={presentingComplaint}
                onChange={(e) => setPresentingComplaint(e.target.value)}
                placeholder="e.g. Chest pain"
              />
              <Input
                label="Working Diagnosis"
                value={workingDiagnosis}
                onChange={(e) => setWorkingDiagnosis(e.target.value)}
                placeholder="e.g. ACS"
              />
              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Ward 4, Bed 12"
              />
            </div>
          </Card>

          {/* History Section */}
          <CollapsibleSection
            title="History"
            stepKey="history"
            icon={FileText}
            status={sectionStatus.history}
            expanded={expandedSteps.has('history')}
            onToggle={() => toggleStep('history')}
          >
            <div className="space-y-4">
              <Textarea
                label="History of Presenting Illness"
                value={hpi}
                onChange={(e) => setHpi(e.target.value)}
                placeholder="Describe the history of the presenting illness..."
              />
              <Textarea
                label="Past Medical History"
                value={pmh}
                onChange={(e) => setPmh(e.target.value)}
                placeholder="One condition per line..."
                helperText="One per line"
              />
              <MedicationEntry
                medications={medications}
                onChange={setMedications}
              />
              <Textarea
                label="Allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="Known allergies and reactions..."
              />
              {/* Secondary history — collapsed by default */}
              <button
                type="button"
                onClick={() => setShowMoreHistory((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                {showMoreHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showMoreHistory ? 'Hide' : 'Show'} surgical history, family & social history, systems review
              </button>
              {showMoreHistory && (
                <div className="space-y-4 pt-1">
                  <Textarea
                    label="Past Surgical History"
                    value={psh}
                    onChange={(e) => setPsh(e.target.value)}
                    placeholder="One procedure per line..."
                    helperText="One per line"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Textarea
                      label="Family History"
                      value={familyHistory}
                      onChange={(e) => setFamilyHistory(e.target.value)}
                      placeholder="Relevant family history..."
                    />
                    <Textarea
                      label="Social History"
                      value={socialHistory}
                      onChange={(e) => setSocialHistory(e.target.value)}
                      placeholder="Smoking, alcohol, occupation, living situation..."
                    />
                  </div>
                  <Textarea
                    label="Systems Review"
                    value={systemsReview}
                    onChange={(e) => setSystemsReview(e.target.value)}
                    placeholder="Systematic review of other systems..."
                  />
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Examination Section */}
          <CollapsibleSection
            title="Examination"
            stepKey="examination"
            icon={Stethoscope}
            status={sectionStatus.examination}
            expanded={expandedSteps.has('examination')}
            onToggle={() => toggleStep('examination')}
          >
            <div className="space-y-4">
              <Textarea
                label="General Appearance"
                value={generalAppearance}
                onChange={(e) => setGeneralAppearance(e.target.value)}
                placeholder="General appearance, alertness, distress level..."
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vital Signs</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  <Input
                    label="HR"
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="bpm"
                  />
                  <Input
                    label="BP"
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                    placeholder="120/80"
                  />
                  <Input
                    label="RR"
                    type="number"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    placeholder="/min"
                  />
                  <Input
                    label="Temp"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="C"
                  />
                  <Input
                    label="SpO2"
                    value={oxygenSat}
                    onChange={(e) => setOxygenSat(e.target.value)}
                    placeholder="%"
                  />
                </div>
              </div>
              {/* System exams — collapsed by default */}
              <button
                type="button"
                onClick={() => setShowSystemExam((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                {showSystemExam ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showSystemExam ? 'Hide' : 'Show'} system examinations (CVS · Resp · Abdo · Neuro)
              </button>
              {showSystemExam && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Textarea
                      label="Cardiovascular"
                      value={cardiovascularExam}
                      onChange={(e) => setCardiovascularExam(e.target.value)}
                      placeholder="Heart sounds, JVP, peripheral pulses..."
                    />
                    <Textarea
                      label="Respiratory"
                      value={respiratoryExam}
                      onChange={(e) => setRespiratoryExam(e.target.value)}
                      placeholder="Chest expansion, percussion, auscultation..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Textarea
                      label="Abdominal"
                      value={abdominalExam}
                      onChange={(e) => setAbdominalExam(e.target.value)}
                      placeholder="Inspection, palpation, percussion..."
                    />
                    <Textarea
                      label="Neurological"
                      value={neurologicalExam}
                      onChange={(e) => setNeurologicalExam(e.target.value)}
                      placeholder="GCS, orientation, cranial nerves, power..."
                    />
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Investigations Section */}
          <CollapsibleSection
            title="Investigations"
            stepKey="investigations"
            icon={Beaker}
            status={sectionStatus.investigations}
            expanded={expandedSteps.has('investigations')}
            onToggle={() => toggleStep('investigations')}
          >
            <div className="space-y-4">
              <Textarea
                label="Investigation Results & Interpretation"
                value={investigationsNotes}
                onChange={(e) => setInvestigationsNotes(e.target.value)}
                placeholder="Blood results, imaging findings, ECG interpretation..."
              />
              <Textarea
                label="Pending Results"
                value={pendingResults}
                onChange={(e) => setPendingResults(e.target.value)}
                placeholder="Results still awaited..."
              />
            </div>
          </CollapsibleSection>

          {/* Assessment Section */}
          <CollapsibleSection
            title="Assessment"
            stepKey="assessment"
            icon={Activity}
            status={sectionStatus.assessment}
            expanded={expandedSteps.has('assessment')}
            onToggle={() => toggleStep('assessment')}
          >
            <div className="space-y-4">
              <Textarea
                label="Clinical Assessment / Impression"
                value={assessmentNotes}
                onChange={(e) => setAssessmentNotes(e.target.value)}
                placeholder="Your clinical impression, differential diagnoses..."
              />
              <Textarea
                label="Problem List"
                value={problemList}
                onChange={(e) => setProblemList(e.target.value)}
                placeholder="[critical] Sepsis\n[high] AKI\nCommunity-acquired pneumonia"
                helperText="Optional severity prefixes: [critical], [high], [medium], [low]"
              />
            </div>
          </CollapsibleSection>

          {/* Plan Section */}
          <CollapsibleSection
            title="Plan"
            stepKey="plan"
            icon={ClipboardList}
            status={sectionStatus.plan}
            expanded={expandedSteps.has('plan')}
            onToggle={() => toggleStep('plan')}
          >
            <div className="space-y-4">
              <Textarea
                label="Management Plan"
                value={managementPlan}
                onChange={(e) => setManagementPlan(e.target.value)}
                placeholder="Detailed management plan for each problem..."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Disposition"
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                  placeholder="e.g. Admit to medical ward"
                />
                <Textarea
                  label="Monitoring Plan"
                  value={monitoringPlan}
                  onChange={(e) => setMonitoringPlan(e.target.value)}
                  placeholder="Observations frequency, fluid balance..."
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Safety Section */}
          <CollapsibleSection
            title="Safety Checklist"
            stepKey="safety"
            icon={Shield}
            status={sectionStatus.safety}
            expanded={expandedSteps.has('safety')}
            onToggle={() => toggleStep('safety')}
          >
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vteConsidered}
                    onChange={(e) => setVteConsidered(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">VTE prophylaxis considered</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={giProphIndicated}
                    onChange={(e) => setGiProphIndicated(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">GI prophylaxis indicated</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linesReviewed}
                    onChange={(e) => setLinesReviewed(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Lines and catheters reviewed</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Falls Risk"
                  value={fallsRisk}
                  onChange={(e) => setFallsRisk(e.target.value as 'low' | 'medium' | 'high')}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
                <Select
                  label="Pressure Injury Risk"
                  value={pressureRisk}
                  onChange={(e) => setPressureRisk(e.target.value as 'low' | 'medium' | 'high')}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
              <Textarea
                label="Additional Safety Notes"
                value={safetyNotes}
                onChange={(e) => setSafetyNotes(e.target.value)}
                placeholder="Any other safety considerations..."
              />
            </div>
          </CollapsibleSection>

          {/* Sign & Submit */}
          <Card padding="md" className="border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Ready to submit?</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Signing will finalize the note, generate problem-based tasks, and escalate high-risk cases to on-call.
                </p>
              </div>
              <Button
                variant="success"
                onClick={handleSignAndSubmit}
                loading={signing}
                disabled={completionPercentage < 50}
                iconLeft={!signing ? <Pen size={16} /> : undefined}
              >
                Sign & Submit
              </Button>
            </div>
            {completionPercentage < 50 && (
              <p className="text-xs text-amber-600 mt-2">
                Complete at least 50% of the sections before signing.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// Collapsible section component
interface CollapsibleSectionProps {
  title: string;
  stepKey: StepKey;
  icon: typeof Activity;
  status: SectionStatus;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  stepKey: _stepKey,
  icon: Icon,
  status,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <Card padding="none">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <span className={clsx('w-2.5 h-2.5 rounded-full', getStatusColor(status))} />
          <span className="text-xs text-slate-400 capitalize">{status}</span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-4">
          {children}
        </div>
      )}
    </Card>
  );
}

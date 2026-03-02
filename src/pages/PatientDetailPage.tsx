import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  User,
  Activity,
  Beaker,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  Heart,
  Pill,
  ShieldAlert,
  FileText,
  BedDouble,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X,
  Plus,
  Stethoscope,
  Thermometer,
  Scissors,
  Camera,
  ClipboardCheck,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { usePatientStore } from '@/stores/patientStore';
import { useTaskStore } from '@/stores/taskStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  updatePatient as updatePatientFirebase,
  deletePatient as deletePatientFirebase,
} from '@/services/firebase/patients';
import { completeTask } from '@/services/firebase/tasks';
import { getLabPanels } from '@/services/firebase/labs';
import { getClerkingNotesByPatient } from '@/services/firebase/clerkingNotes';
import { analyzeTrend } from '@/utils/deltaEngine';
import { ACUITY_LEVELS } from '@/config/constants';
import { STATE_METADATA } from '@/types/patientState';
import type { Patient, PatientFormData } from '@/types/patient';
import type { LabPanel, LabFlag, LabTrend } from '@/types/lab';
import type { ClerkingNote } from '@/types/clerking';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScanNotesButton, type ClinicalExtractionResponse } from '@/components/clerking/ScanNotesButton';
import { getPatientHistory, savePatientHistory } from '@/services/firebase/history';
import type { PatientHistory } from '@/types/history';
import { EMPTY_HISTORY } from '@/types/history';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showAISuggestions = useSettingsStore((s) => s.showAISuggestions);
  const labTrendDays = useSettingsStore((s) => s.labTrendDays);

  const patients = usePatientStore((s) => s.patients);
  const updatePatientStore = usePatientStore((s) => s.updatePatient);
  const removePatientStore = usePatientStore((s) => s.removePatient);
  const getTasksByPatient = useTaskStore((s) => s.getTasksByPatient);

  const patient = useMemo(
    () => patients.find((p) => p.id === id) || null,
    [patients, id]
  );

  const patientTasks = useMemo(
    () => (id ? getTasksByPatient(id) : []),
    [id, getTasksByPatient]
  );

  const [activeTab, setActiveTab] = useState('overview');
  const [labs, setLabs] = useState<LabPanel[]>([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [clerkingNotes, setClerkingNotes] = useState<ClerkingNote[]>([]);
  const [clerkingLoading, setClerkingLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PatientFormData>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [editDiagnosisInput, setEditDiagnosisInput] = useState('');
  const [editAllergyInput, setEditAllergyInput] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Patient history state
  const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySaving, setHistorySaving] = useState(false);
  const [showAddPMH, setShowAddPMH] = useState(false);
  const [showAddPSH, setShowAddPSH] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [pmhInput, setPmhInput] = useState('');
  const [pshInput, setPshInput] = useState('');
  const [medNameInput, setMedNameInput] = useState('');
  const [medDoseInput, setMedDoseInput] = useState('');
  const [medFreqInput, setMedFreqInput] = useState('');

  useEffect(() => {
    setClerkingNotes([]);
    setClerkingLoading(false);
  }, [id]);

  // Load patient history
  useEffect(() => {
    if (!id) return;
    setHistoryLoading(true);
    getPatientHistory(id)
      .then((data) => setPatientHistory(data))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, [id]);

  // Load labs when tab switches
  useEffect(() => {
    if (activeTab === 'labs' && id && labs.length === 0) {
      setLabsLoading(true);
      getLabPanels(id)
        .then((data) => setLabs(data))
        .catch(console.error)
        .finally(() => setLabsLoading(false));
    }
  }, [activeTab, id, labs.length]);

  // Load clerking notes on mount (needed for overview summary + clerking tab)
  useEffect(() => {
    if (id && clerkingNotes.length === 0) {
      setClerkingLoading(true);
      getClerkingNotesByPatient(id, 20)
        .then((data) => setClerkingNotes(data))
        .catch(console.error)
        .finally(() => setClerkingLoading(false));
    }
  }, [id, clerkingNotes.length]);

  // Compute lab trends from panels filtered by labTrendDays setting
  const labTrends = useMemo(() => {
    if (labs.length < 2) return [];
    const cutoff = Date.now() - labTrendDays * 24 * 60 * 60 * 1000;
    const recentLabs = labs.filter((p) => {
      if (!p.collectedAt) return true;
      const ts = typeof p.collectedAt === 'object' && 'toDate' in p.collectedAt
        ? p.collectedAt.toDate().getTime()
        : 0;
      return ts >= cutoff || ts === 0;
    });
    if (recentLabs.length < 2) return [];

    // Collect unique lab tests by analyteKey (preferred) or name
    const labTests = new Map<string, { name: string; analyteKey?: string }>();
    for (const panel of recentLabs) {
      for (const val of panel.values) {
        const key = val.analyteKey || val.name;
        if (key && !labTests.has(key)) {
          labTests.set(key, { name: val.name, analyteKey: val.analyteKey });
        }
      }
    }

    const trends: LabTrend[] = [];
    for (const [, { name, analyteKey }] of labTests) {
      const trend = analyzeTrend(recentLabs, name, analyteKey);
      if (trend) trends.push(trend);
    }
    return trends;
  }, [labs, labTrendDays]);

  // Group panels by cleaned name for flowsheet display
  const groupedPanels = useMemo(() => {
    const groups = new Map<string, LabPanel[]>();
    for (const panel of labs) {
      const name = cleanPanelName(panel.panelName);
      const existing = groups.get(name) || [];
      existing.push(panel);
      groups.set(name, existing);
    }
    for (const [, panels] of groups) {
      panels.sort((a, b) => getTimestampMs(b.collectedAt) - getTimestampMs(a.collectedAt));
    }
    return groups;
  }, [labs]);

  // Populate edit form when patient changes
  useEffect(() => {
    if (patient) {
      setEditForm({
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        wardId: patient.wardId,
        bedNumber: patient.bedNumber,
        acuity: patient.acuity,
        primaryDiagnosis: patient.primaryDiagnosis,
        diagnoses: patient.diagnoses,
        allergies: patient.allergies,
        codeStatus: patient.codeStatus,
        attendingPhysician: patient.attendingPhysician,
        team: patient.team,
        notes: patient.notes,
      });
    }
  }, [patient]);

  if (!patient) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card padding="lg" className="text-center max-w-sm">
          <AlertCircle size={40} className="mx-auto text-slate-400 mb-3" />
          <h2 className="text-lg font-semibold text-ward-text">Patient Not Found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
            This patient may have been removed or you may not have access.
          </p>
          <Button variant="secondary" onClick={() => navigate('/patients')}>
            Back to Patients
          </Button>
        </Card>
      </div>
    );
  }

  function getAcuityVariant(acuity: 1 | 2 | 3 | 4 | 5) {
    switch (acuity) {
      case 1: return 'critical' as const;
      case 2: return 'warning' as const;
      case 3: return 'default' as const;
      case 4: return 'success' as const;
      case 5: return 'info' as const;
    }
  }

  function getStateVariant(state: string) {
    switch (state) {
      case 'unstable': return 'critical' as const;
      case 'incoming': return 'info' as const;
      case 'active': return 'success' as const;
      case 'ready_dc': return 'warning' as const;
      case 'discharged': return 'muted' as const;
      default: return 'default' as const;
    }
  }

  function getLabFlagColor(flag: LabFlag): string {
    switch (flag) {
      case 'normal': return 'text-green-600';
      case 'low': return 'text-blue-600';
      case 'high': return 'text-amber-600';
      case 'critical_low': return 'text-red-600 font-bold';
      case 'critical_high': return 'text-red-600 font-bold';
      default: return 'text-slate-600';
    }
  }

  function getLabFlagText(flag: LabFlag): string | null {
    switch (flag) {
      case 'high': return 'H';
      case 'low': return 'L';
      case 'critical_high': return 'CH';
      case 'critical_low': return 'CL';
      default: return null;
    }
  }

  function cleanPanelName(name: string): string {
    const parts = name.split(',').map((s) => s.trim()).filter(Boolean);
    return [...new Set(parts)].join(', ') || 'Misc';
  }

  /** Strip trailing flag letters (H, L, CH, CL) that AI extraction embeds in raw values */
  function cleanLabValue(val: string | number | null | undefined): string {
    if (val === null || val === undefined) return '—';
    const s = String(val).trim();
    if (!s || s === 'null' || s === 'undefined' || s === 'NaN') return '—';
    return s.replace(/\s+(CH|CL|H|L)\s*$/i, '').trim();
  }

  function getTimestampMs(ts: unknown): number {
    if (!ts) return 0;
    if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
      return (ts as { toDate: () => Date }).toDate().getTime();
    }
    return 0;
  }

  function formatTimestamp(ts: unknown): string {
    if (!ts) return '';
    if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
      return format((ts as { toDate: () => Date }).toDate(), 'MMM d HH:mm');
    }
    return '';
  }

  function formatNoteTimestamp(ts: unknown): string {
    if (!ts) return 'Unknown time';
    if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
      return format((ts as { toDate: () => Date }).toDate(), 'MMM d, HH:mm');
    }
    if (ts instanceof Date) {
      return format(ts, 'MMM d, HH:mm');
    }
    return 'Unknown time';
  }

  function validateEditForm(): boolean {
    const errors: Record<string, string> = {};
    if (!editForm.firstName?.trim()) errors.firstName = 'First name is required';
    if (!editForm.lastName?.trim()) errors.lastName = 'Last name is required';
    if (!editForm.mrn?.trim()) errors.mrn = 'MRN is required';
    if (!editForm.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    if (!editForm.bedNumber?.trim()) errors.bedNumber = 'Bed number is required';
    if (!editForm.primaryDiagnosis?.trim()) errors.primaryDiagnosis = 'Primary diagnosis is required';
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleEditPatient(e: FormEvent) {
    e.preventDefault();
    if (!id || !validateEditForm()) return;
    setEditSaving(true);
    try {
      await updatePatientFirebase(id, editForm);
      updatePatientStore(id, editForm as Partial<Patient>);
      setShowEditModal(false);
      setEditErrors({});
      setEditDiagnosisInput('');
      setEditAllergyInput('');
    } catch (err) {
      console.error('Error updating patient:', err);
      setEditErrors({ general: 'Failed to save changes. Please try again.' });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeletePatient() {
    if (!id) return;
    try {
      await deletePatientFirebase(id);
      removePatientStore(id);
      navigate('/patients', { replace: true });
    } catch (err) {
      console.error('Error deleting patient:', err);
    }
  }

  async function handleCompleteTask(taskId: string) {
    if (!user) return;
    setCompletingTask(taskId);
    try {
      await completeTask(taskId, user.id);
    } catch (err) {
      console.error('Error completing task:', err);
    } finally {
      setCompletingTask(null);
    }
  }

  function addEditDiagnosis() {
    if (editDiagnosisInput.trim()) {
      const current = editForm.diagnoses || [];
      setEditForm({ ...editForm, diagnoses: [...current, editDiagnosisInput.trim()] });
      setEditDiagnosisInput('');
    }
  }

  function removeEditDiagnosis(index: number) {
    const current = editForm.diagnoses || [];
    setEditForm({ ...editForm, diagnoses: current.filter((_, i) => i !== index) });
  }

  function addEditAllergy() {
    if (editAllergyInput.trim()) {
      const current = editForm.allergies || [];
      setEditForm({ ...editForm, allergies: [...current, editAllergyInput.trim()] });
      setEditAllergyInput('');
    }
  }

  function removeEditAllergy(index: number) {
    const current = editForm.allergies || [];
    setEditForm({ ...editForm, allergies: current.filter((_, i) => i !== index) });
  }

  // --- Patient History inline helpers ---
  async function saveHistoryUpdate(updated: Partial<PatientHistory>) {
    if (!id || !user) return;
    setHistorySaving(true);
    try {
      const current = patientHistory || { ...EMPTY_HISTORY };
      const merged = { ...current, ...updated };
      // Build the payload without the server-managed fields
      const payload = {
        hpiText: merged.hpiText || '',
        pmh: merged.pmh || [],
        psh: merged.psh || [],
        medications: merged.medications || [],
        familyHistory: merged.familyHistory || [],
        socialHistory: merged.socialHistory || { smoking: '', alcohol: '', occupation: '', livingSituation: '' },
        allergiesDetailed: merged.allergiesDetailed || [],
        systemsReview: merged.systemsReview || '',
        examination: merged.examination || undefined,
        assessment: merged.assessment || '',
        plan: merged.plan || '',
      };
      await savePatientHistory(id, payload, user.id);
      setPatientHistory({ ...merged, patientId: id } as PatientHistory);
    } catch (err) {
      console.error('Error saving patient history:', err);
    } finally {
      setHistorySaving(false);
    }
  }

  function handleAddPMH() {
    if (!pmhInput.trim()) return;
    const current = patientHistory?.pmh || [];
    saveHistoryUpdate({ pmh: [...current, { condition: pmhInput.trim(), status: 'active' }] });
    setPmhInput('');
    setShowAddPMH(false);
  }

  function handleRemovePMH(index: number) {
    const current = patientHistory?.pmh || [];
    saveHistoryUpdate({ pmh: current.filter((_, i) => i !== index) });
  }

  function handleAddPSH() {
    if (!pshInput.trim()) return;
    const current = patientHistory?.psh || [];
    saveHistoryUpdate({ psh: [...current, { procedure: pshInput.trim() }] });
    setPshInput('');
    setShowAddPSH(false);
  }

  function handleRemovePSH(index: number) {
    const current = patientHistory?.psh || [];
    saveHistoryUpdate({ psh: current.filter((_, i) => i !== index) });
  }

  function handleAddMed() {
    if (!medNameInput.trim()) return;
    const current = patientHistory?.medications || [];
    saveHistoryUpdate({
      medications: [...current, {
        name: medNameInput.trim(),
        dose: medDoseInput.trim() || undefined,
        frequency: medFreqInput.trim() || undefined,
        status: 'active',
      }],
    });
    setMedNameInput('');
    setMedDoseInput('');
    setMedFreqInput('');
    setShowAddMed(false);
  }

  function handleRemoveMed(index: number) {
    const current = patientHistory?.medications || [];
    saveHistoryUpdate({ medications: current.filter((_, i) => i !== index) });
  }

  function handleScanToHistory(data: ClinicalExtractionResponse, acceptedFields: Set<string>) {
    const updates: Partial<PatientHistory> = {};
    const currentHist = patientHistory || { ...EMPTY_HISTORY };

    // HPI
    if (acceptedFields.has('historyOfPresentingIllness') && data.historyOfPresentingIllness) {
      updates.hpiText = [currentHist.hpiText, data.historyOfPresentingIllness].filter(Boolean).join('\n\n');
    }
    // Presenting complaint prepended to HPI
    if (acceptedFields.has('presentingComplaint') && data.presentingComplaint) {
      const current = updates.hpiText ?? currentHist.hpiText ?? '';
      updates.hpiText = current ? `${data.presentingComplaint}\n\n${current}` : data.presentingComplaint;
    }

    // PMH
    if (acceptedFields.has('pastMedicalHistory') && data.pastMedicalHistory.length > 0) {
      const existing = (currentHist.pmh || []).map((p) => p.condition.toLowerCase());
      const newPmh = data.pastMedicalHistory
        .filter((p) => !existing.includes(p.toLowerCase()))
        .map((p) => ({ condition: p, status: 'active' as const }));
      updates.pmh = [...(currentHist.pmh || []), ...newPmh];
    }

    // PSH
    if (acceptedFields.has('pastSurgicalHistory') && data.pastSurgicalHistory.length > 0) {
      const existing = (currentHist.psh || []).map((p) => p.procedure.toLowerCase());
      const newPsh = data.pastSurgicalHistory
        .filter((p) => !existing.includes(p.toLowerCase()))
        .map((p) => ({ procedure: p }));
      updates.psh = [...(currentHist.psh || []), ...newPsh];
    }

    // Medications
    if (acceptedFields.has('medications') && data.medications.length > 0) {
      const existing = (currentHist.medications || []).map((m) => m.name.toLowerCase());
      const newMeds = data.medications
        .filter((m) => !existing.includes(m.name.toLowerCase()))
        .map((m) => ({ name: m.name, dose: m.dose, route: m.route, frequency: m.frequency, indication: m.indication, status: 'active' as const }));
      updates.medications = [...(currentHist.medications || []), ...newMeds];
    }

    // Allergies (detailed)
    if (acceptedFields.has('allergies') && data.allergies.length > 0) {
      const existing = (currentHist.allergiesDetailed || []).map((a) => a.substance.toLowerCase());
      const newAllergies = data.allergies
        .filter((a) => !existing.includes(a.substance.toLowerCase()))
        .map((a) => ({ substance: a.substance, reaction: a.reaction, severity: a.severity, type: a.type }));
      updates.allergiesDetailed = [...(currentHist.allergiesDetailed || []), ...newAllergies];
    }

    // Social History
    if (acceptedFields.has('socialHistory')) {
      const sh = data.socialHistory;
      updates.socialHistory = {
        smoking: sh.smoking || currentHist.socialHistory?.smoking || '',
        alcohol: sh.alcohol || currentHist.socialHistory?.alcohol || '',
        occupation: sh.occupation || currentHist.socialHistory?.occupation || '',
        livingSituation: sh.living || currentHist.socialHistory?.livingSituation || '',
        substances: sh.illicitDrugs || currentHist.socialHistory?.substances || '',
      };
    }

    // Family History
    if (acceptedFields.has('familyHistory') && data.familyHistory) {
      const existing = (currentHist.familyHistory || []);
      updates.familyHistory = [...existing, { relation: '', condition: data.familyHistory }];
    }

    // Systems Review
    if (acceptedFields.has('systemsReview') && data.systemsReview) {
      updates.systemsReview = [currentHist.systemsReview, data.systemsReview].filter(Boolean).join('\n');
    }

    // Examination (vitals + system exams)
    if (acceptedFields.has('vitals') || acceptedFields.has('generalAppearance') || acceptedFields.has('systemExams')) {
      const existingExam = currentHist.examination || {};
      updates.examination = {
        generalAppearance: data.examination?.generalAppearance || existingExam.generalAppearance,
        vitals: {
          heartRate: data.examination?.heartRate || existingExam.vitals?.heartRate,
          bloodPressure: data.examination?.bloodPressure || existingExam.vitals?.bloodPressure,
          respiratoryRate: data.examination?.respiratoryRate || existingExam.vitals?.respiratoryRate,
          temperature: data.examination?.temperature || existingExam.vitals?.temperature,
          oxygenSaturation: data.examination?.oxygenSaturation || existingExam.vitals?.oxygenSaturation,
        },
        cardiovascular: data.examination?.cardiovascular || existingExam.cardiovascular,
        respiratory: data.examination?.respiratory || existingExam.respiratory,
        abdominal: data.examination?.abdominal || existingExam.abdominal,
        neurological: data.examination?.neurological || existingExam.neurological,
      };
    }

    // Assessment
    if (acceptedFields.has('assessment') && data.assessment) {
      updates.assessment = [currentHist.assessment, data.assessment].filter(Boolean).join('\n\n');
    }
    if (acceptedFields.has('problemList') && data.problemList) {
      const current = updates.assessment ?? currentHist.assessment ?? '';
      updates.assessment = current ? `${current}\n\nProblem List:\n${data.problemList}` : `Problem List:\n${data.problemList}`;
    }

    // Plan
    if (acceptedFields.has('managementPlan') && data.plan?.managementPlan) {
      updates.plan = [currentHist.plan, data.plan.managementPlan].filter(Boolean).join('\n\n');
    }
    if (acceptedFields.has('disposition') && data.plan?.disposition) {
      const current = updates.plan ?? currentHist.plan ?? '';
      updates.plan = current ? `${current}\n\nDisposition: ${data.plan.disposition}` : `Disposition: ${data.plan.disposition}`;
    }
    if (acceptedFields.has('monitoringPlan') && data.plan?.monitoring) {
      const current = updates.plan ?? currentHist.plan ?? '';
      updates.plan = current ? `${current}\n\nMonitoring: ${data.plan.monitoring}` : `Monitoring: ${data.plan.monitoring}`;
    }

    if (Object.keys(updates).length > 0) {
      saveHistoryUpdate(updates);
    }
  }

  function calculateAge(dob: string): string {
    if (!dob) return '';
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age}y`;
  }

  const activeTasks = patientTasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  const overdueTasks = activeTasks.filter((t) => {
    if (!t.dueAt) return false;
    const due = typeof t.dueAt === 'object' && 'toDate' in t.dueAt
      ? (t.dueAt as { toDate: () => Date }).toDate()
      : new Date(t.dueAt as unknown as string);
    return due < new Date();
  });

  const tabItems = [
    { id: 'overview', label: 'Overview', icon: <User size={16} /> },
    { id: 'history', label: 'History', icon: <Activity size={16} /> },
    { id: 'labs', label: 'Labs', icon: <Beaker size={16} /> },
    {
      id: 'tasks',
      label: `Tasks${activeTasks.length > 0 ? ` (${activeTasks.length})` : ''}`,
      icon: <ClipboardList size={16} />,
    },
  ];

  const acuityBorderColor =
    patient.acuity === 1 ? 'border-l-red-500' :
    patient.acuity === 2 ? 'border-l-orange-400' :
    patient.acuity === 3 ? 'border-l-yellow-400' :
    patient.acuity === 4 ? 'border-l-emerald-400' : 'border-l-blue-400';

  return (
    <div className="space-y-4">
      {/* ---- Back navigation ---- */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/patients')}
        iconLeft={<ArrowLeft size={15} />}
      >
        All Patients
      </Button>

      {/* ---- Patient header card ---- */}
      <div className={clsx('bg-ward-card rounded-xl border border-ward-border border-l-4 p-3 sm:p-4', acuityBorderColor)}>
        <div className="flex items-start gap-3">
          {/* Acuity circle */}
          <div className={clsx(
            'flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl text-base sm:text-lg font-bold',
            patient.acuity === 1 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
            patient.acuity === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' :
            patient.acuity === 3 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
            patient.acuity === 4 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' :
            'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
          )}>
            {patient.acuity}
          </div>

          {/* Info block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                {patient.lastName}, {patient.firstName}
              </h1>
              {patient.dateOfBirth && (
                <span className="text-xs sm:text-sm text-slate-400">{calculateAge(patient.dateOfBirth)}</span>
              )}
              {patient.gender && (
                <span className="text-xs sm:text-sm text-slate-400">
                  {patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'O'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant={getAcuityVariant(patient.acuity)} dot>
                {ACUITY_LEVELS[patient.acuity].label}
              </Badge>
              {patient.state && (
                <Badge variant={getStateVariant(patient.state)}>
                  {STATE_METADATA[patient.state]?.label || patient.state}
                </Badge>
              )}
              {overdueTasks.length > 0 && (
                <Badge variant="critical">{overdueTasks.length} overdue</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-[10px] sm:text-xs text-slate-500 flex-wrap">
              <span>MRN: <strong>{patient.mrn}</strong></span>
              <span className="flex items-center gap-1">
                <BedDouble size={11} /> Bed <strong>{patient.bedNumber}</strong>
              </span>
              {patient.wardId && patient.wardId !== 'default' && (
                <span>Ward: <strong>{patient.wardId}</strong></span>
              )}
              {patient.attendingPhysician && <span>Dr. <strong>{patient.attendingPhysician}</strong></span>}
              {patient.team && <span>Team: <strong>{patient.team}</strong></span>}
            </div>
          </div>
        </div>

        {/* Action buttons — full width row on mobile */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" size="sm" className="flex-1 sm:flex-initial" onClick={() => setShowEditModal(true)} iconLeft={<Edit3 size={13} />}>Edit</Button>
          <Button variant="danger" size="sm" className="flex-1 sm:flex-initial" onClick={() => setShowDeleteConfirm(true)} iconLeft={<Trash2 size={13} />}>Delete</Button>
        </div>
      </div>

      {/* ---- Safety banners ---- */}

      {/* Allergy alert */}
      {patient.allergies && patient.allergies.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800">
          <ShieldAlert size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-300 uppercase tracking-wide">Allergy Alert</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {patient.allergies.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700 text-xs font-semibold rounded">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Code status banner (non-full code) */}
      {patient.codeStatus && patient.codeStatus !== 'full' && (
        <div className={clsx(
          'flex items-center gap-3 px-4 py-3 rounded-xl border-2',
          patient.codeStatus === 'comfort'
            ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800'
            : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800',
        )}>
          <Heart size={18} className={patient.codeStatus === 'comfort' ? 'text-purple-600 dark:text-purple-400 shrink-0' : 'text-red-600 dark:text-red-400 shrink-0'} />
          <div>
            <p className={clsx('text-sm font-bold uppercase tracking-wide', patient.codeStatus === 'comfort' ? 'text-purple-800 dark:text-purple-300' : 'text-red-800 dark:text-red-300')}>
              Code Status:{' '}
              {patient.codeStatus === 'DNR' ? 'Do Not Resuscitate (DNR)' :
               patient.codeStatus === 'DNI' ? 'Do Not Intubate (DNI)' :
               'Comfort Care Only'}
            </p>
            <p className={clsx('text-xs', patient.codeStatus === 'comfort' ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400')}>
              Confirmed with patient / next of kin — document in notes
            </p>
          </div>
        </div>
      )}

      {/* ---- Primary diagnosis summary ---- */}
      <div className="px-4 py-3 bg-ward-card rounded-xl border border-ward-border">
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Primary Diagnosis</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{patient.primaryDiagnosis}</p>
        {patient.diagnoses.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {patient.diagnoses.map((d, i) => (
              <Badge key={i} variant="default" size="sm">{d}</Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        {/* Tabs */}
        <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} className="mb-4" />

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Demographics + Location — combined card */}
            <Card padding="md">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Demographics & Location
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">Gender</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">{patient.gender}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">Date of Birth</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {patient.dateOfBirth}
                    {patient.dateOfBirth && <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">({calculateAge(patient.dateOfBirth)})</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">Ward</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{patient.wardId && patient.wardId !== 'default' ? patient.wardId : 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">Bed</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{patient.bedNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">Team</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{patient.team || <span className="text-slate-400 dark:text-slate-500 font-normal italic">Not assigned</span>}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">Attending</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{patient.attendingPhysician || <span className="text-slate-400 dark:text-slate-500 font-normal italic">Not assigned</span>}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">Weight</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {patient.weight ? <>{patient.weight} <span className="font-normal text-slate-400 dark:text-slate-500">kg</span></> : <span className="text-slate-400 dark:text-slate-500 font-normal italic">—</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">Height</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {patient.height ? <>{patient.height} <span className="font-normal text-slate-400 dark:text-slate-500">cm</span></> : <span className="text-slate-400 dark:text-slate-500 font-normal italic">—</span>}
                  </p>
                </div>
              </div>
              {/* BMI row */}
              {patient.weight && patient.height && patient.height > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">BMI</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {(patient.weight / ((patient.height / 100) ** 2)).toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">kg/m²</span>
                    {(() => {
                      const bmi = patient.weight / ((patient.height / 100) ** 2);
                      if (bmi < 18.5) return <Badge variant="info" size="sm">Underweight</Badge>;
                      if (bmi < 25) return <Badge variant="success" size="sm">Normal</Badge>;
                      if (bmi < 30) return <Badge variant="warning" size="sm">Overweight</Badge>;
                      return <Badge variant="critical" size="sm">Obese</Badge>;
                    })()}
                  </div>
                </div>
              )}
            </Card>

            {/* Diagnoses */}
            <Card padding="md">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Diagnoses
              </h3>
              <div className="flex items-start gap-2 mb-2">
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase mt-0.5 shrink-0">Primary</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{patient.primaryDiagnosis}</p>
              </div>
              {patient.diagnoses.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.diagnoses.map((d, i) => (
                    <Badge key={i} variant="default" size="sm">{d}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">No additional diagnoses</p>
              )}
            </Card>

            {/* Safety Row — Allergies + Code Status side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Allergies */}
              <Card padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert size={15} className="text-red-500" />
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Allergies
                  </h3>
                </div>
                {patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {patient.allergies.map((a, i) => (
                      <Badge key={i} variant="critical" size="sm">{a}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">NKDA</p>
                )}
              </Card>

              {/* Code Status */}
              <Card padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <Heart size={15} className="text-pink-500" />
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Code Status
                  </h3>
                </div>
                <Badge
                  variant={patient.codeStatus === 'full' ? 'success' : patient.codeStatus === 'comfort' ? 'warning' : 'critical'}
                  size="md"
                >
                  {patient.codeStatus === 'full' ? 'Full Code' :
                   patient.codeStatus === 'DNR' ? 'DNR — Do Not Resuscitate' :
                   patient.codeStatus === 'DNI' ? 'DNI — Do Not Intubate' :
                   'Comfort Care Only'}
                </Badge>
              </Card>
            </div>

            {/* Notes */}
            {patient.notes && (
              <Card padding="md">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Clinical Notes
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{patient.notes}</p>
              </Card>
            )}

            {/* Latest Clerking Summary */}
            {clerkingNotes.length > 0 && (() => {
              const latest = clerkingNotes[0];
              const latestVitals = latest.examination?.vitals;
              const latestProblems = Array.isArray(latest.problemList) ? latest.problemList : [];
              return (
                <Card padding="md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                      Latest Clerking
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-0.5"
                    >
                      View full note <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {isUsableText(latest.presentingComplaint) || latest.workingDiagnosis || 'Clerking note'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatNoteTimestamp(latest.signedAt || latest.updatedAt || latest.createdAt)} · {latest.authorName}
                        </p>
                      </div>
                      <Badge
                        variant={latest.status === 'signed' ? 'success' : latest.status === 'amended' ? 'warning' : 'default'}
                        size="sm"
                      >
                        {latest.status}
                      </Badge>
                    </div>
                    {latest.workingDiagnosis && (
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-medium">Working Dx:</span> {latest.workingDiagnosis}
                      </p>
                    )}
                    {latestVitals && (() => {
                      const hr = safeNum(latestVitals.heartRate);
                      const sys = safeNum(latestVitals.bloodPressureSystolic);
                      const dia = safeNum(latestVitals.bloodPressureDiastolic);
                      const spo2 = safeNum(latestVitals.oxygenSaturation);
                      const temp = safeNum(latestVitals.temperature);
                      if (!hr && !sys && !spo2 && !temp) return null;
                      return (
                        <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400">
                          {hr != null && <span>HR <span className="font-semibold text-slate-900 dark:text-slate-100">{hr}</span></span>}
                          {sys != null && <span>BP <span className="font-semibold text-slate-900 dark:text-slate-100">{sys}/{dia ?? '—'}</span></span>}
                          {spo2 != null && <span>SpO2 <span className="font-semibold text-slate-900 dark:text-slate-100">{spo2}%</span></span>}
                          {temp != null && <span>T <span className="font-semibold text-slate-900 dark:text-slate-100">{temp}°</span></span>}
                        </div>
                      );
                    })()}
                    {latestProblems.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {latestProblems.slice(0, 4).map((problem) => (
                          <Badge
                            key={problem.id}
                            variant={problem.severity === 'critical' ? 'critical' : problem.severity === 'high' ? 'warning' : 'default'}
                            size="sm"
                          >
                            {problem.title}
                          </Badge>
                        ))}
                        {latestProblems.length > 4 && (
                          <Badge variant="muted" size="sm">+{latestProblems.length - 4} more</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}
          </div>
        )}

        {/* ═══════════════════ History Tab ═══════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-6">

            {/* ── Scan & Actions Hero ── */}
            <Card padding="lg" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800/50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                    <Camera size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Scan Clinical Notes</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Photograph handwritten notes to auto-populate all sections below
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ScanNotesButton
                    onExtracted={(data: ClinicalExtractionResponse, acceptedFields: Set<string>) => {
                      handleScanToHistory(data, acceptedFields);
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/clerking?patientId=${encodeURIComponent(patient.id)}`)}
                    iconLeft={<Stethoscope size={14} />}
                  >
                    Full Clerking
                  </Button>
                </div>
              </div>
            </Card>

            {historyLoading ? (
              <div className="py-12">
                <Spinner size="lg" label="Loading patient history..." />
              </div>
            ) : (
              <>
                {/* ── Section 1: HPI ── */}
                {patientHistory?.hpiText && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={15} className="text-blue-500" />
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        History of Presenting Illness
                      </h3>
                    </div>
                    <Card padding="md">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {patientHistory.hpiText}
                      </p>
                    </Card>
                  </div>
                )}

                {/* ── Section 2: PMH + PSH side by side ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PMH */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Heart size={15} className="text-red-500" />
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Past Medical History
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddPMH(!showAddPMH)}
                        className="flex items-center gap-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                    <Card padding="md" className="h-full">
                      {showAddPMH && (
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={pmhInput}
                            onChange={(e) => setPmhInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPMH(); } }}
                            placeholder="e.g. Hypertension, Type 2 DM"
                            className="flex-1 h-9 px-3 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                            autoFocus
                          />
                          <Button type="button" size="sm" onClick={handleAddPMH} loading={historySaving}>Add</Button>
                        </div>
                      )}
                      {(patientHistory?.pmh || []).length > 0 ? (
                        <ul className="space-y-1">
                          {(patientHistory?.pmh || []).map((entry, i) => (
                            <li key={i} className="flex items-center gap-2 group">
                              <span className={clsx(
                                'w-2 h-2 rounded-full shrink-0',
                                entry.status === 'active' ? 'bg-blue-500' : entry.status === 'resolved' ? 'bg-green-500' : 'bg-slate-400',
                              )} />
                              <span className="text-sm text-slate-800 dark:text-slate-200 flex-1">{entry.condition}</span>
                              {entry.status && (
                                <span className={clsx(
                                  'text-[10px] font-medium uppercase tracking-wide',
                                  entry.status === 'active' ? 'text-blue-500' : entry.status === 'resolved' ? 'text-green-500' : 'text-slate-400',
                                )}>{entry.status}</span>
                              )}
                              <button type="button" onClick={() => handleRemovePMH(i)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <X size={12} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">No conditions recorded</p>
                      )}
                    </Card>
                  </div>

                  {/* PSH */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Scissors size={15} className="text-purple-500" />
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Past Surgical History
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddPSH(!showAddPSH)}
                        className="flex items-center gap-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                    <Card padding="md" className="h-full">
                      {showAddPSH && (
                        <div className="flex gap-2 mb-3">
                          <input
                            type="text"
                            value={pshInput}
                            onChange={(e) => setPshInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPSH(); } }}
                            placeholder="e.g. Appendicectomy 2019"
                            className="flex-1 h-9 px-3 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                            autoFocus
                          />
                          <Button type="button" size="sm" onClick={handleAddPSH} loading={historySaving}>Add</Button>
                        </div>
                      )}
                      {(patientHistory?.psh || []).length > 0 ? (
                        <ul className="space-y-1">
                          {(patientHistory?.psh || []).map((entry, i) => (
                            <li key={i} className="flex items-center gap-2 group">
                              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                              <span className="text-sm text-slate-800 dark:text-slate-200 flex-1">{entry.procedure}</span>
                              {entry.year && <span className="text-xs text-slate-400 dark:text-slate-500">{entry.year}</span>}
                              <button type="button" onClick={() => handleRemovePSH(i)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <X size={12} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">No surgeries recorded</p>
                      )}
                    </Card>
                  </div>
                </div>

                {/* ── Section 3: Medications ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Pill size={15} className="text-emerald-500" />
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Current Medications
                      </h3>
                      {(patientHistory?.medications || []).length > 0 && (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 px-1.5 py-0.5 rounded-full">
                          {(patientHistory?.medications || []).length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddMed(!showAddMed)}
                      className="flex items-center gap-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  <Card padding="none">
                    {showAddMed && (
                      <div className="flex gap-2 p-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                        <input
                          type="text"
                          value={medNameInput}
                          onChange={(e) => setMedNameInput(e.target.value)}
                          placeholder="Drug name"
                          className="flex-1 min-w-[120px] h-9 px-3 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={medDoseInput}
                          onChange={(e) => setMedDoseInput(e.target.value)}
                          placeholder="Dose"
                          className="w-28 h-9 px-3 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={medFreqInput}
                          onChange={(e) => setMedFreqInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMed(); } }}
                          placeholder="Frequency"
                          className="w-28 h-9 px-3 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                        />
                        <Button type="button" size="sm" onClick={handleAddMed} loading={historySaving}>Add</Button>
                      </div>
                    )}
                    {(patientHistory?.medications || []).length > 0 ? (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(patientHistory?.medications || []).map((med, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <div className={clsx(
                              'w-2 h-2 rounded-full shrink-0',
                              med.status === 'active' ? 'bg-emerald-500' : med.status === 'prn' ? 'bg-amber-500' : 'bg-slate-400',
                            )} />
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 min-w-[100px]">{med.name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">
                              {[med.dose, med.route, med.frequency].filter(Boolean).join(' · ')}
                            </span>
                            {med.indication && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 italic hidden sm:inline">{med.indication}</span>
                            )}
                            <button type="button" onClick={() => handleRemoveMed(i)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic p-4">No medications recorded</p>
                    )}
                  </Card>
                </div>

                {/* ── Section 4: Allergies (detailed from scan) ── */}
                {(patientHistory?.allergiesDetailed || []).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={15} className="text-red-500" />
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Allergies
                      </h3>
                    </div>
                    <Card padding="none">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(patientHistory?.allergiesDetailed || []).map((allergy, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                            <span className={clsx(
                              'w-2 h-2 rounded-full shrink-0',
                              allergy.severity === 'life-threatening' ? 'bg-red-600' :
                              allergy.severity === 'severe' ? 'bg-red-500' :
                              allergy.severity === 'moderate' ? 'bg-amber-500' : 'bg-yellow-400',
                            )} />
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{allergy.substance}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">{allergy.reaction}</span>
                            <span className={clsx(
                              'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full',
                              allergy.severity === 'life-threatening' ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400' :
                              allergy.severity === 'severe' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' :
                              allergy.severity === 'moderate' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
                              'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400',
                            )}>
                              {allergy.severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {/* ── Section 5: Social + Family History side by side ── */}
                {(() => {
                  const sh = patientHistory?.socialHistory;
                  const hasSocial = sh && (sh.smoking || sh.alcohol || sh.occupation || sh.livingSituation || sh.substances);
                  const hasFamily = (patientHistory?.familyHistory || []).length > 0;
                  if (!hasSocial && !hasFamily) return null;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {hasSocial && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Users size={15} className="text-indigo-500" />
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Social History
                            </h3>
                          </div>
                          <Card padding="md" className="h-full">
                            <div className="space-y-2.5">
                              {sh!.occupation && (
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-20 shrink-0 pt-0.5">Occupation</span>
                                  <span className="text-sm text-slate-700 dark:text-slate-300">{sh!.occupation}</span>
                                </div>
                              )}
                              {sh!.smoking && (
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-20 shrink-0 pt-0.5">Smoking</span>
                                  <span className="text-sm text-slate-700 dark:text-slate-300">{sh!.smoking}</span>
                                </div>
                              )}
                              {sh!.alcohol && (
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-20 shrink-0 pt-0.5">Alcohol</span>
                                  <span className="text-sm text-slate-700 dark:text-slate-300">{sh!.alcohol}</span>
                                </div>
                              )}
                              {sh!.substances && (
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-20 shrink-0 pt-0.5">Substances</span>
                                  <span className="text-sm text-slate-700 dark:text-slate-300">{sh!.substances}</span>
                                </div>
                              )}
                              {sh!.livingSituation && (
                                <div className="flex items-start gap-2">
                                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-20 shrink-0 pt-0.5">Living</span>
                                  <span className="text-sm text-slate-700 dark:text-slate-300">{sh!.livingSituation}</span>
                                </div>
                              )}
                            </div>
                          </Card>
                        </div>
                      )}
                      {hasFamily && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Heart size={15} className="text-pink-500" />
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Family History
                            </h3>
                          </div>
                          <Card padding="md" className="h-full">
                            <ul className="space-y-1.5">
                              {(patientHistory?.familyHistory || []).map((fh, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0 mt-1.5" />
                                  <span className="text-slate-700 dark:text-slate-300">
                                    {fh.relation && <strong className="font-medium">{fh.relation}: </strong>}
                                    {fh.condition}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </Card>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Section 6: Systems Review ── */}
                {patientHistory?.systemsReview && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardCheck size={15} className="text-teal-500" />
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Systems Review
                      </h3>
                    </div>
                    <Card padding="md">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {patientHistory.systemsReview}
                      </p>
                    </Card>
                  </div>
                )}

                {/* ── Section 7: Examination ── */}
                {patientHistory?.examination && (
                  patientHistory.examination.generalAppearance ||
                  patientHistory.examination.vitals?.heartRate ||
                  patientHistory.examination.vitals?.bloodPressure ||
                  patientHistory.examination.cardiovascular ||
                  patientHistory.examination.respiratory ||
                  patientHistory.examination.abdominal ||
                  patientHistory.examination.neurological
                ) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope size={15} className="text-sky-500" />
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Examination
                      </h3>
                    </div>

                    {/* General Appearance */}
                    {patientHistory.examination.generalAppearance && (
                      <Card padding="md" className="mb-3">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">General Appearance</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{patientHistory.examination.generalAppearance}</p>
                      </Card>
                    )}

                    {/* Vitals Grid */}
                    {patientHistory.examination.vitals && (
                      patientHistory.examination.vitals.heartRate ||
                      patientHistory.examination.vitals.bloodPressure ||
                      patientHistory.examination.vitals.respiratoryRate ||
                      patientHistory.examination.vitals.temperature ||
                      patientHistory.examination.vitals.oxygenSaturation
                    ) && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                        {patientHistory.examination.vitals.heartRate && (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3 text-center">
                            <Activity size={16} className="mx-auto text-red-500 mb-1" />
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{patientHistory.examination.vitals.heartRate}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">HR (bpm)</p>
                          </div>
                        )}
                        {patientHistory.examination.vitals.bloodPressure && (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3 text-center">
                            <Activity size={16} className="mx-auto text-blue-500 mb-1" />
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{patientHistory.examination.vitals.bloodPressure}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">BP (mmHg)</p>
                          </div>
                        )}
                        {patientHistory.examination.vitals.respiratoryRate && (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3 text-center">
                            <Activity size={16} className="mx-auto text-teal-500 mb-1" />
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{patientHistory.examination.vitals.respiratoryRate}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">RR (/min)</p>
                          </div>
                        )}
                        {patientHistory.examination.vitals.temperature && (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3 text-center">
                            <Thermometer size={16} className="mx-auto text-amber-500 mb-1" />
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{patientHistory.examination.vitals.temperature}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Temp</p>
                          </div>
                        )}
                        {patientHistory.examination.vitals.oxygenSaturation && (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3 text-center">
                            <Activity size={16} className="mx-auto text-sky-500 mb-1" />
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{patientHistory.examination.vitals.oxygenSaturation}%</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">SpO2</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* System Examinations */}
                    {(patientHistory.examination.cardiovascular || patientHistory.examination.respiratory || patientHistory.examination.abdominal || patientHistory.examination.neurological) && (
                      <Card padding="none">
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {patientHistory.examination.cardiovascular && (
                            <div className="px-4 py-3">
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Cardiovascular</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{patientHistory.examination.cardiovascular}</p>
                            </div>
                          )}
                          {patientHistory.examination.respiratory && (
                            <div className="px-4 py-3">
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Respiratory</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{patientHistory.examination.respiratory}</p>
                            </div>
                          )}
                          {patientHistory.examination.abdominal && (
                            <div className="px-4 py-3">
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Abdominal</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{patientHistory.examination.abdominal}</p>
                            </div>
                          )}
                          {patientHistory.examination.neurological && (
                            <div className="px-4 py-3">
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Neurological</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{patientHistory.examination.neurological}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {/* ── Section 8: Assessment ── */}
                {patientHistory?.assessment && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList size={15} className="text-amber-500" />
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Assessment
                      </h3>
                    </div>
                    <Card padding="md">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {patientHistory.assessment}
                      </p>
                    </Card>
                  </div>
                )}

                {/* ── Section 9: Plan ── */}
                {patientHistory?.plan && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={15} className="text-green-500" />
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Plan
                      </h3>
                    </div>
                    <Card padding="md">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {patientHistory.plan}
                      </p>
                    </Card>
                  </div>
                )}

                {/* ── Empty state if nothing at all ── */}
                {!patientHistory?.hpiText
                  && (patientHistory?.pmh || []).length === 0
                  && (patientHistory?.psh || []).length === 0
                  && (patientHistory?.medications || []).length === 0
                  && (patientHistory?.allergiesDetailed || []).length === 0
                  && !patientHistory?.examination
                  && !patientHistory?.assessment
                  && !patientHistory?.plan
                  && (
                  <Card padding="lg" className="text-center">
                    <div className="py-4">
                      <Camera size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">No history recorded yet</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                        Scan handwritten clinical notes to automatically populate all sections, or add entries manually above.
                      </p>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ── Clerking Notes divider ── */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-ward-border" />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Clerking Notes
              </span>
              <div className="flex-1 h-px bg-ward-border" />
            </div>

            {clerkingLoading ? (
              <div className="py-8">
                <Spinner size="md" label="Loading clinical notes..." />
              </div>
            ) : clerkingNotes.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<FileText size={24} />}
                  title="No clerking notes yet"
                  description="Start a clerking to document a full clinical encounter."
                  action={
                    <Button size="sm" onClick={() => navigate(`/clerking?patientId=${encodeURIComponent(patient.id)}`)} iconLeft={<Stethoscope size={14} />}>
                      Start Clerking
                    </Button>
                  }
                />
              </Card>
            ) : (
              clerkingNotes.map((note) => (
                <ClerkingNoteSummary key={note.id} note={note} formatTimestamp={formatNoteTimestamp} />
              ))
            )}
          </div>
        )}

        {/* Labs Tab */}
        {activeTab === 'labs' && (
          <div className="space-y-4">
            {labsLoading ? (
              <div className="py-16">
                <Spinner size="lg" label="Loading lab results..." />
              </div>
            ) : labs.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Beaker size={24} />}
                  title="No lab results"
                  description="No lab panels have been recorded for this patient."
                  action={
                    <Button size="sm" onClick={() => navigate('/labs')}>
                      Upload Labs
                    </Button>
                  }
                />
              </Card>
            ) : (
              <>
                {/* Compact trend pills — only non-stable */}
                {labTrends.filter((t) => t.direction !== 'stable').length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {labTrends
                      .filter((t) => t.direction !== 'stable')
                      .map((trend) => (
                        <div
                          key={trend.labName}
                          className={clsx(
                            'flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap shrink-0',
                            trend.direction === 'increasing'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : trend.direction === 'decreasing'
                              ? 'border-blue-200 bg-blue-50 text-blue-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700',
                          )}
                        >
                          {trend.direction === 'increasing' ? (
                            <TrendingUp size={12} />
                          ) : trend.direction === 'decreasing' ? (
                            <TrendingDown size={12} />
                          ) : (
                            <AlertTriangle size={12} />
                          )}
                          {trend.labName}
                          {trend.values.length > 0 && (
                            <span className="font-bold tabular-nums ml-0.5">
                              {cleanLabValue(trend.values[trend.values.length - 1].value)}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {/* Flowsheet panels */}
                {Array.from(groupedPanels.entries()).map(([groupName, panels]) => {
                  const testNames = [...new Set(panels.flatMap((p) => p.values.map((v) => v.name)))];
                  const displayPanels = panels.slice(0, 4);
                  const latest = displayPanels[0];

                  return (
                    <Card key={groupName} padding="sm">
                      {/* Panel header */}
                      <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <Beaker size={14} className="text-slate-400 shrink-0" />
                          <h3 className="text-sm font-bold text-slate-900 truncate">{groupName}</h3>
                          {panels.length > 1 && (
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {panels.length}x
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400">{formatTimestamp(latest.collectedAt)}</span>
                          <Badge
                            variant={latest.status === 'reviewed' ? 'success' : latest.status === 'resulted' ? 'info' : 'muted'}
                            size="sm"
                          >
                            {latest.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Desktop: Flowsheet table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-1.5 pr-3 text-xs font-semibold text-slate-500 w-32">Test</th>
                              {displayPanels.map((p) => (
                                <th key={p.id} className="text-right py-1.5 px-2 text-[10px] font-medium text-slate-400 min-w-[80px]">
                                  {formatTimestamp(p.collectedAt)}
                                </th>
                              ))}
                              <th className="text-right py-1.5 pl-3 text-xs font-medium text-slate-400 w-24">Ref</th>
                            </tr>
                          </thead>
                          <tbody>
                            {testNames.map((name) => {
                              const latestVal = latest.values.find((v) => v.name === name);
                              const isCritical = latestVal?.flag === 'critical_low' || latestVal?.flag === 'critical_high';

                              return (
                                <tr
                                  key={name}
                                  className={clsx(
                                    'border-b border-slate-50 hover:bg-slate-50/50',
                                    isCritical && 'bg-red-50/60',
                                  )}
                                >
                                  <td className="py-1.5 pr-3">
                                    <span className="text-xs font-medium text-slate-800">{name}</span>
                                    {latestVal?.unit && (
                                      <span className="text-[10px] text-slate-400 ml-1">{latestVal.unit}</span>
                                    )}
                                  </td>
                                  {displayPanels.map((p, pi) => {
                                    const val = p.values.find((v) => v.name === name);
                                    if (!val) return <td key={p.id} className="py-1.5 px-2 text-right text-slate-300 text-xs">—</td>;
                                    const flagText = getLabFlagText(val.flag);

                                    return (
                                      <td key={p.id} className={clsx('py-1.5 px-2 text-right tabular-nums text-xs', getLabFlagColor(val.flag))}>
                                        <span className={clsx(pi === 0 && 'font-semibold')}>{cleanLabValue(val.value)}</span>
                                        {flagText && (
                                          <span className={clsx(
                                            'ml-0.5 text-[9px] font-bold',
                                            val.flag.includes('critical') ? 'text-red-600' : val.flag === 'high' ? 'text-amber-600' : 'text-blue-600',
                                          )}>
                                            {flagText}
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="py-1.5 pl-3 text-right text-[10px] text-slate-400">
                                    {latestVal?.referenceMin != null && latestVal?.referenceMax != null
                                      ? `${latestVal.referenceMin}–${latestVal.referenceMax}`
                                      : ''}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile: Simple lab report table */}
                      <table className="sm:hidden w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="text-left py-1.5 font-medium">Test</th>
                            <th className="text-right py-1.5 font-medium">Result</th>
                            <th className="text-center py-1.5 font-medium w-8">Flag</th>
                            <th className="text-right py-1.5 font-medium">Ref</th>
                          </tr>
                        </thead>
                        <tbody>
                          {testNames.map((name) => {
                            const latestVal = latest.values.find((v) => v.name === name);
                            if (!latestVal) return null;
                            const isCritical = latestVal.flag === 'critical_low' || latestVal.flag === 'critical_high';
                            const flagText = getLabFlagText(latestVal.flag);

                            return (
                              <tr
                                key={name}
                                className={clsx(
                                  'border-b border-slate-50',
                                  isCritical && 'bg-red-50',
                                )}
                              >
                                <td className="py-1.5 pr-2 text-slate-800 font-medium">{name}</td>
                                <td className={clsx('py-1.5 text-right tabular-nums font-semibold', getLabFlagColor(latestVal.flag))}>
                                  {cleanLabValue(latestVal.value)} <span className="font-normal text-slate-400">{latestVal.unit}</span>
                                </td>
                                <td className="py-1.5 text-center">
                                  {flagText && (
                                    <span className={clsx(
                                      'text-[9px] font-bold px-1 py-0.5 rounded',
                                      isCritical ? 'bg-red-100 text-red-700' :
                                      latestVal.flag === 'high' ? 'bg-amber-100 text-amber-700' :
                                      'bg-blue-100 text-blue-700',
                                    )}>
                                      {flagText}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1.5 text-right text-slate-400 tabular-nums">
                                  {latestVal.referenceMin != null && latestVal.referenceMax != null
                                    ? `${latestVal.referenceMin}–${latestVal.referenceMax}`
                                    : ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* AI Analysis */}
                      {showAISuggestions && latest.aiAnalysis && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs font-medium text-blue-700 mb-1">AI Analysis</p>
                          <p className="text-sm text-blue-900">{latest.aiAnalysis.summary}</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {patientTasks.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<ClipboardList size={24} />}
                  title="No tasks"
                  description="No tasks have been assigned for this patient."
                  action={
                    <Button size="sm" onClick={() => navigate('/tasks')}>
                      Create Task
                    </Button>
                  }
                />
              </Card>
            ) : (
              patientTasks.map((task) => (
                <Card key={task.id} padding="md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={clsx(
                          'text-sm font-medium',
                          task.status === 'completed' ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100',
                        )}>
                          {task.title}
                        </p>
                        <Badge
                          variant={
                            task.priority === 'critical' ? 'critical' :
                            task.priority === 'high' ? 'warning' :
                            task.priority === 'medium' ? 'default' :
                            'muted'
                          }
                          size="sm"
                        >
                          {task.priority}
                        </Badge>
                        <Badge
                          variant={
                            task.status === 'completed' ? 'success' :
                            task.status === 'in_progress' ? 'info' :
                            task.status === 'cancelled' ? 'muted' :
                            'default'
                          }
                          size="sm"
                        >
                          {task.status === 'in_progress' ? 'In Progress' : task.status}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        {task.dueAt && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Due:{' '}
                            {typeof task.dueAt === 'object' && 'toDate' in task.dueAt
                              ? format(task.dueAt.toDate(), 'MMM d, HH:mm')
                              : 'N/A'}
                          </span>
                        )}
                        {task.assignedToName && (
                          <span>Assigned to: {task.assignedToName}</span>
                        )}
                      </div>
                    </div>
                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                      <Button
                        variant="success"
                        size="sm"
                        loading={completingTask === task.id}
                        onClick={() => handleCompleteTask(task.id)}
                        iconLeft={<CheckCircle2 size={14} />}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Patient Modal */}
      <Modal
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setEditDiagnosisInput(''); setEditAllergyInput(''); }}
        title="Edit Patient"
        size="lg"
      >
        <form onSubmit={handleEditPatient} className="space-y-5">
          {editErrors.general && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{editErrors.general}</p>
            </div>
          )}

          {/* ── Section: Patient Identity ── */}
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Patient Identity</p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={editForm.firstName || ''}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  error={editErrors.firstName}
                  required
                />
                <Input
                  label="Last Name"
                  value={editForm.lastName || ''}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  error={editErrors.lastName}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="MRN"
                  value={editForm.mrn || ''}
                  onChange={(e) => setEditForm({ ...editForm, mrn: e.target.value })}
                  error={editErrors.mrn}
                  required
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={editForm.dateOfBirth || ''}
                  onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                  error={editErrors.dateOfBirth}
                  required
                />
                <Select
                  label="Gender"
                  value={editForm.gender || 'male'}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as PatientFormData['gender'] })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t border-ward-border" />

          {/* ── Section: Ward & Location ── */}
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Ward & Location</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Ward"
                value={editForm.wardId || ''}
                onChange={(e) => setEditForm({ ...editForm, wardId: e.target.value })}
                placeholder="e.g. 4A, ICU-1"
              />
              <Input
                label="Bed Number"
                value={editForm.bedNumber || ''}
                onChange={(e) => setEditForm({ ...editForm, bedNumber: e.target.value })}
                error={editErrors.bedNumber}
                required
              />
              <Select
                label="Acuity Level"
                value={String(editForm.acuity || 3)}
                onChange={(e) => setEditForm({ ...editForm, acuity: Number(e.target.value) as PatientFormData['acuity'] })}
              >
                <option value="1">1 — Critical</option>
                <option value="2">2 — Acute</option>
                <option value="3">3 — Moderate</option>
                <option value="4">4 — Stable</option>
                <option value="5">5 — Discharge Ready</option>
              </Select>
            </div>
          </div>

          <div className="border-t border-ward-border" />

          {/* ── Section: Clinical Information ── */}
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Clinical Information</p>
            <div className="space-y-4">
              <Input
                label="Primary Diagnosis"
                value={editForm.primaryDiagnosis || ''}
                onChange={(e) => setEditForm({ ...editForm, primaryDiagnosis: e.target.value })}
                error={editErrors.primaryDiagnosis}
                placeholder="e.g. Community-acquired pneumonia"
                required
              />

              {/* Additional diagnoses with chips */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Additional Diagnoses</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editDiagnosisInput}
                    onChange={(e) => setEditDiagnosisInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEditDiagnosis(); } }}
                    placeholder="Type and press Enter"
                    className="flex-1 h-10 px-3 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={addEditDiagnosis}>Add</Button>
                </div>
                {(editForm.diagnoses || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(editForm.diagnoses || []).map((d, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-full">
                        {d}
                        <button type="button" onClick={() => removeEditDiagnosis(i)} className="hover:text-red-600 dark:hover:text-red-400">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Attending Physician"
                  value={editForm.attendingPhysician || ''}
                  onChange={(e) => setEditForm({ ...editForm, attendingPhysician: e.target.value })}
                  placeholder="Dr. Smith"
                />
                <Input
                  label="Team"
                  value={editForm.team || ''}
                  onChange={(e) => setEditForm({ ...editForm, team: e.target.value })}
                  placeholder="e.g. Medical Team A"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-ward-border" />

          {/* ── Section: Measurements ── */}
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Measurements</p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Weight (kg)"
                type="number"
                value={editForm.weight ?? ''}
                onChange={(e) => setEditForm({ ...editForm, weight: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 72"
                min={0}
                max={500}
                step={0.1}
              />
              <Input
                label="Height (cm)"
                type="number"
                value={editForm.height ?? ''}
                onChange={(e) => setEditForm({ ...editForm, height: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 175"
                min={0}
                max={300}
                step={0.1}
              />
            </div>
            {editForm.weight && editForm.height && editForm.height > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                BMI: <strong className="text-slate-700 dark:text-slate-200">{(editForm.weight / ((editForm.height / 100) ** 2)).toFixed(1)}</strong> kg/m²
              </p>
            )}
          </div>

          <div className="border-t border-ward-border" />

          {/* ── Section: Safety ── */}
          <div>
            <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3">Patient Safety</p>
            <div className="space-y-4">
              {/* Allergies with chips */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-red-500" />
                  <label className="block text-sm font-medium text-red-700 dark:text-red-400">Allergies</label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editAllergyInput}
                    onChange={(e) => setEditAllergyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEditAllergy(); } }}
                    placeholder="Drug / substance allergy"
                    className="flex-1 h-10 px-3 rounded-lg text-sm bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={addEditAllergy}>Add</Button>
                </div>
                {(editForm.allergies || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(editForm.allergies || []).map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs rounded-full font-medium">
                        <ShieldAlert size={10} />
                        {a}
                        <button type="button" onClick={() => removeEditAllergy(i)} className="hover:text-red-900 dark:hover:text-red-300 ml-0.5">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {(editForm.allergies || []).length === 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">NKDA — No known drug allergies</p>
                )}
              </div>

              {/* Code status */}
              <div>
                <Select
                  label="Code Status"
                  value={editForm.codeStatus || 'full'}
                  onChange={(e) => setEditForm({ ...editForm, codeStatus: e.target.value as PatientFormData['codeStatus'] })}
                >
                  <option value="full">Full Code</option>
                  <option value="DNR">DNR — Do Not Resuscitate</option>
                  <option value="DNI">DNI — Do Not Intubate</option>
                  <option value="comfort">Comfort Care Only</option>
                </Select>
                {editForm.codeStatus && editForm.codeStatus !== 'full' && (
                  <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <Heart size={12} className="text-red-500 shrink-0" />
                    <span className="text-xs font-medium text-red-700 dark:text-red-400">Non-standard code status — verify with patient/NOK</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-ward-border" />

          {/* ── Notes ── */}
          <Textarea
            label="Clinical Notes"
            value={editForm.notes || ''}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            placeholder="Admission notes, important background..."
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-ward-border">
            <Button type="button" variant="secondary" onClick={() => { setShowEditModal(false); setEditDiagnosisInput(''); setEditAllergyInput(''); }}>
              Cancel
            </Button>
            <Button type="submit" loading={editSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Patient"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg shrink-0">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-700">
                Are you sure you want to delete{' '}
                <span className="font-semibold">{patient.firstName} {patient.lastName}</span>?
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeletePatient}>
              Delete Patient
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clerking Note Summary — compact, collapsible view
// ---------------------------------------------------------------------------

const MAX_ASSESSMENT_CHARS = 150;
const MAX_HPI_CHARS = 300;
const MAX_PROBLEMS_SHOWN = 5;

/** Returns true if the string looks like a real clinical value, not AI placeholder text */
function isUsableText(text: string | undefined | null): string | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  if (lower.startsWith('not explicitly') || lower.startsWith('not stated') || lower.startsWith('not provided') || lower.startsWith('n/a') || lower === 'null' || lower === 'undefined') return null;
  return text;
}

/** Returns a display-safe number or null if the value is not a valid finite number */
function safeNum(val: unknown): number | null {
  if (val == null) return null;
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : null;
}

function ClerkingNoteSummary({ note, formatTimestamp }: { note: ClerkingNote; formatTimestamp: (d: unknown) => string }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const problems = Array.isArray(note.problemList) ? note.problemList : [];
  const vitals = note.examination?.vitals;

  // Sort problems: critical first, then high, then the rest
  const sortedProblems = [...problems].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  const hasHistory = note.history && (
    note.history.historyOfPresentingIllness ||
    (note.history.pastMedicalHistory && note.history.pastMedicalHistory.length > 0) ||
    (note.history.medications && note.history.medications.length > 0) ||
    (note.history.allergies && note.history.allergies.length > 0)
  );
  const hasExam = note.examination && (
    note.examination.general || note.examination.cardiovascular ||
    note.examination.respiratory || note.examination.abdominal ||
    note.examination.neurological
  );
  const hasPlan = note.plan && (
    note.plan.managementPlan || (note.plan.consults && note.plan.consults.length > 0) || note.plan.monitoring
  );
  const hasSafety = note.safety && (note.safety.vteProph || note.safety.fallsRisk || note.safety.sepsisSix);

  const toggle = (key: string) => setExpandedSections((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const isExpanded = (key: string) => expandedSections.has(key);

  const assessmentTruncated = note.assessmentSummary && note.assessmentSummary.length > MAX_ASSESSMENT_CHARS;

  return (
    <Card padding="md">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {isUsableText(note.presentingComplaint) || note.workingDiagnosis || 'Clerking note'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatTimestamp(note.signedAt || note.updatedAt || note.createdAt)} · {note.authorName}
            {note.location && <> · {note.location}</>}
          </p>
        </div>
        <Badge
          variant={note.status === 'signed' ? 'success' : note.status === 'amended' ? 'warning' : 'default'}
          size="sm"
        >
          {note.status}
        </Badge>
      </div>

      {note.workingDiagnosis && (
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
          <span className="font-semibold">Working Dx:</span> {note.workingDiagnosis}
        </p>
      )}

      {/* ── Assessment (truncated) ────────────────────────────── */}
      {note.assessmentSummary && (
        <div className="mb-2">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold">Assessment:</span>{' '}
            {assessmentTruncated && !isExpanded('assessment')
              ? note.assessmentSummary.slice(0, MAX_ASSESSMENT_CHARS) + '...'
              : note.assessmentSummary}
          </p>
          {assessmentTruncated && (
            <button
              type="button"
              onClick={() => toggle('assessment')}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5"
            >
              {isExpanded('assessment') ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* ── Vitals (inline) ───────────────────────────────────── */}
      {vitals && (() => {
        const hr = safeNum(vitals.heartRate);
        const sys = safeNum(vitals.bloodPressureSystolic);
        const dia = safeNum(vitals.bloodPressureDiastolic);
        const rr = safeNum(vitals.respiratoryRate);
        const temp = safeNum(vitals.temperature);
        const spo2 = safeNum(vitals.oxygenSaturation);
        if (!hr && !sys && !rr && !temp && !spo2) return null;
        return (
          <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400 mb-2 py-1.5 border-y border-slate-100 dark:border-slate-800">
            {hr != null && <span>HR <span className="font-semibold text-slate-900 dark:text-slate-100">{hr}</span></span>}
            {sys != null && <span>BP <span className="font-semibold text-slate-900 dark:text-slate-100">{sys}/{dia ?? '—'}</span></span>}
            {rr != null && <span>RR <span className="font-semibold text-slate-900 dark:text-slate-100">{rr}</span></span>}
            {temp != null && <span>T <span className="font-semibold text-slate-900 dark:text-slate-100">{temp}°</span></span>}
            {spo2 != null && <span>SpO2 <span className="font-semibold text-slate-900 dark:text-slate-100">{spo2}%</span></span>}
          </div>
        );
      })()}

      {/* ── Problem List (top N, collapsed rest) ──────────────── */}
      {sortedProblems.length > 0 && (
        <div className="mb-2">
          <div className="flex flex-wrap gap-1.5">
            {(isExpanded('problems') ? sortedProblems : sortedProblems.slice(0, MAX_PROBLEMS_SHOWN)).map((problem) => (
              <Badge
                key={problem.id}
                variant={
                  problem.severity === 'critical' ? 'critical'
                  : problem.severity === 'high' ? 'warning'
                  : problem.severity === 'medium' ? 'info'
                  : 'default'
                }
                size="sm"
              >
                {problem.title}
              </Badge>
            ))}
            {sortedProblems.length > MAX_PROBLEMS_SHOWN && !isExpanded('problems') && (
              <button
                type="button"
                onClick={() => toggle('problems')}
                className="text-xs text-blue-600 dark:text-blue-400 font-medium px-1"
              >
                +{sortedProblems.length - MAX_PROBLEMS_SHOWN} more
              </button>
            )}
            {isExpanded('problems') && sortedProblems.length > MAX_PROBLEMS_SHOWN && (
              <button
                type="button"
                onClick={() => toggle('problems')}
                className="text-xs text-blue-600 dark:text-blue-400 font-medium px-1"
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Expandable detail sections ────────────────────────── */}
      <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2 space-y-0.5">
        {hasHistory && (
          <NoteDetailSection title="History" expanded={isExpanded('history')} onToggle={() => toggle('history')}>
            <div className="space-y-2">
              {note.history?.historyOfPresentingIllness && (() => {
                const hpi = note.history.historyOfPresentingIllness;
                const isTruncated = hpi.length > MAX_HPI_CHARS;
                return (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">HPI</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {isTruncated && !isExpanded('hpi') ? hpi.slice(0, MAX_HPI_CHARS) + '...' : hpi}
                    </p>
                    {isTruncated && (
                      <button type="button" onClick={() => toggle('hpi')} className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                        {isExpanded('hpi') ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                );
              })()}
              {note.history?.pastMedicalHistory && note.history.pastMedicalHistory.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">PMH</p>
                  <div className="flex flex-wrap gap-1.5">
                    {note.history.pastMedicalHistory.map((pmh, i) => (
                      <Badge key={i} variant="default" size="sm">{pmh}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {note.history?.medications && note.history.medications.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Medications</p>
                  <div className="space-y-1">
                    {note.history.medications.map((med, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                        <Pill size={12} className="text-slate-400 shrink-0" />
                        <span className="font-medium">{med.name}</span>
                        {med.dose && <span className="text-slate-500">{med.dose}</span>}
                        {med.frequency && <span className="text-slate-500">{med.frequency}</span>}
                        {med.isHighRisk && <Badge variant="critical" size="sm">High Risk</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {note.history?.allergies && note.history.allergies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Allergies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {note.history.allergies.map((a, i) => (
                      <Badge key={i} variant="critical" size="sm">{a.substance} ({a.reaction})</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </NoteDetailSection>
        )}

        {hasExam && (
          <NoteDetailSection title="Examination" expanded={isExpanded('exam')} onToggle={() => toggle('exam')}>
            <div className="space-y-2">
              {note.examination?.general && (
                <p className="text-sm text-slate-700 dark:text-slate-300">{note.examination.general.appearance}</p>
              )}
              {(['cardiovascular', 'respiratory', 'abdominal', 'neurological'] as const).map((sys) => {
                const exam = note.examination?.[sys];
                if (!exam || !exam.findings) return null;
                return (
                  <div key={sys} className="flex items-start gap-2">
                    <Badge variant={exam.isNormal ? 'success' : 'warning'} size="sm" className="mt-0.5 shrink-0">
                      {exam.isNormal ? 'NAD' : 'ABN'}
                    </Badge>
                    <div>
                      <span className="text-xs font-medium text-slate-500 capitalize">{sys}: </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{exam.findings}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </NoteDetailSection>
        )}

        {hasPlan && (
          <NoteDetailSection title="Plan" expanded={isExpanded('plan')} onToggle={() => toggle('plan')}>
            <div className="space-y-2">
              {note.plan?.managementPlan && (
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{note.plan.managementPlan}</p>
              )}
              {note.plan?.disposition && (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">Disposition:</span> {note.plan.disposition}
                </p>
              )}
              {note.plan?.monitoring?.vitalsFrequency && (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">Monitoring:</span> {note.plan.monitoring.vitalsFrequency}
                </p>
              )}
            </div>
          </NoteDetailSection>
        )}

        {hasSafety && (
          <NoteDetailSection title="Safety" expanded={isExpanded('safety')} onToggle={() => toggle('safety')}>
            <div className="flex flex-wrap gap-2">
              {note.safety?.vteProph && (
                <div className="flex items-center gap-1.5 text-sm">
                  {note.safety.vteProph.considered ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertCircle size={14} className="text-amber-500" />}
                  <span className="text-slate-700 dark:text-slate-300">VTE</span>
                </div>
              )}
              {note.safety?.fallsRisk && (
                <Badge variant={note.safety.fallsRisk.risk === 'high' ? 'critical' : note.safety.fallsRisk.risk === 'medium' ? 'warning' : 'success'} size="sm">
                  Falls: {note.safety.fallsRisk.risk}
                </Badge>
              )}
              {note.safety?.pressureInjury && (
                <Badge variant={note.safety.pressureInjury.risk === 'high' ? 'critical' : note.safety.pressureInjury.risk === 'medium' ? 'warning' : 'success'} size="sm">
                  Pressure: {note.safety.pressureInjury.risk}
                </Badge>
              )}
              {note.safety?.sepsisSix?.applicable && (
                <div className="flex items-center gap-1.5 text-sm">
                  {note.safety.sepsisSix.completed ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertCircle size={14} className="text-red-500" />}
                  <span className="text-slate-700 dark:text-slate-300">Sepsis 6</span>
                </div>
              )}
            </div>
          </NoteDetailSection>
        )}

        {note.sbarText && (
          <NoteDetailSection title="SBAR Handover" expanded={isExpanded('sbar')} onToggle={() => toggle('sbar')}>
            <pre className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-[1.6] bg-slate-50 dark:bg-slate-900/60 rounded-lg p-3 max-h-48 overflow-y-auto">
              {note.sbarText}
            </pre>
          </NoteDetailSection>
        )}
      </div>
    </Card>
  );
}

function NoteDetailSection({ title, expanded, onToggle, children }: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <span>{title}</span>
        <ChevronDown size={14} className={clsx('transition-transform', expanded && 'rotate-180')} />
      </button>
      {expanded && <div className="pb-2">{children}</div>}
    </div>
  );
}

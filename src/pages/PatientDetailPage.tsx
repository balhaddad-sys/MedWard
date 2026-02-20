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
  Heart,
  Pill,
  ShieldAlert,
  FileText,
  Plus,
  BedDouble,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
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
import { getPatientHistory } from '@/services/firebase/history';
import { getLabPanels } from '@/services/firebase/labs';
import { analyzeTrend } from '@/utils/deltaEngine';
import { ACUITY_LEVELS } from '@/config/constants';
import { STATE_METADATA } from '@/types/patientState';
import type { Patient, PatientFormData } from '@/types/patient';
import type { PatientHistory } from '@/types/history';
import type { LabPanel, LabFlag, LabTrend } from '@/types/lab';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

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
  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [labs, setLabs] = useState<LabPanel[]>([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PatientFormData>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  // Load history when tab switches
  useEffect(() => {
    if (activeTab === 'history' && id && !history) {
      setHistoryLoading(true);
      getPatientHistory(id)
        .then((data) => setHistory(data))
        .catch(console.error)
        .finally(() => setHistoryLoading(false));
    }
  }, [activeTab, id, history]);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card padding="lg" className="text-center max-w-sm">
          <AlertCircle size={40} className="mx-auto text-slate-400 mb-3" />
          <h2 className="text-lg font-semibold text-slate-900">Patient Not Found</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">
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

  async function handleEditPatient(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setEditSaving(true);
    try {
      await updatePatientFirebase(id, editForm);
      updatePatientStore(id, editForm as Partial<Patient>);
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating patient:', err);
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
      <div className={clsx('bg-white rounded-xl border border-slate-200 border-l-4 p-3 sm:p-4', acuityBorderColor)}>
        <div className="flex items-start gap-3">
          {/* Acuity circle */}
          <div className={clsx(
            'flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl text-base sm:text-lg font-bold',
            patient.acuity === 1 ? 'bg-red-100 text-red-700' :
            patient.acuity === 2 ? 'bg-orange-100 text-orange-700' :
            patient.acuity === 3 ? 'bg-yellow-100 text-yellow-700' :
            patient.acuity === 4 ? 'bg-emerald-100 text-emerald-700' :
            'bg-blue-100 text-blue-700',
          )}>
            {patient.acuity}
          </div>

          {/* Info block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate">
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
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
          <Button variant="secondary" size="sm" className="flex-1 sm:flex-initial" onClick={() => setShowEditModal(true)} iconLeft={<Edit3 size={13} />}>Edit</Button>
          <Button variant="danger" size="sm" className="flex-1 sm:flex-initial" onClick={() => setShowDeleteConfirm(true)} iconLeft={<Trash2 size={13} />}>Delete</Button>
        </div>
      </div>

      {/* ---- Safety banners ---- */}

      {/* Allergy alert */}
      {patient.allergies && patient.allergies.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border-2 border-red-300">
          <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 uppercase tracking-wide">Allergy Alert</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {patient.allergies.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 text-xs font-semibold rounded">
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
          patient.codeStatus === 'comfort' ? 'bg-purple-50 border-purple-300' : 'bg-red-50 border-red-300',
        )}>
          <Heart size={18} className={patient.codeStatus === 'comfort' ? 'text-purple-600 shrink-0' : 'text-red-600 shrink-0'} />
          <div>
            <p className={clsx('text-sm font-bold uppercase tracking-wide', patient.codeStatus === 'comfort' ? 'text-purple-800' : 'text-red-800')}>
              Code Status:{' '}
              {patient.codeStatus === 'DNR' ? 'Do Not Resuscitate (DNR)' :
               patient.codeStatus === 'DNI' ? 'Do Not Intubate (DNI)' :
               'Comfort Care Only'}
            </p>
            <p className={clsx('text-xs', patient.codeStatus === 'comfort' ? 'text-purple-600' : 'text-red-600')}>
              Confirmed with patient / next of kin — document in notes
            </p>
          </div>
        </div>
      )}

      {/* ---- Quick actions ---- */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button variant="secondary" size="sm" className="shrink-0" onClick={() => navigate('/handover')} iconLeft={<FileText size={13} />}>
          SBAR
        </Button>
        <Button variant="secondary" size="sm" className="shrink-0" onClick={() => navigate('/tasks')} iconLeft={<Plus size={13} />}>
          Task
        </Button>
        <Button variant="secondary" size="sm" className="shrink-0" onClick={() => navigate('/labs')} iconLeft={<Beaker size={13} />}>
          Labs
        </Button>
        <Button variant="secondary" size="sm" className="shrink-0" onClick={() => navigate('/ai')} iconLeft={<Activity size={13} />}>
          AI
        </Button>
      </div>

      {/* ---- Primary diagnosis summary ---- */}
      <div className="px-4 py-3 bg-white rounded-xl border border-slate-200">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Primary Diagnosis</p>
        <p className="text-sm font-semibold text-slate-900">{patient.primaryDiagnosis}</p>
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
          <div className="space-y-6">
            {/* Demographics */}
            <Card padding="md">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Demographics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Gender', value: patient.gender },
                  { label: 'Date of Birth', value: patient.dateOfBirth },
                  { label: 'Ward', value: patient.wardId },
                  { label: 'Bed', value: patient.bedNumber },
                  { label: 'Team', value: patient.team || 'Not assigned' },
                  { label: 'Attending', value: patient.attendingPhysician || 'Not assigned' },
                  { label: 'Weight', value: patient.weight ? `${patient.weight} kg` : 'N/A' },
                  { label: 'Height', value: patient.height ? `${patient.height} cm` : 'N/A' },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-sm font-medium text-slate-900 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Diagnoses */}
            <Card padding="md">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Diagnoses
              </h3>
              <p className="text-sm font-medium text-slate-900 mb-2">
                Primary: {patient.primaryDiagnosis}
              </p>
              {patient.diagnoses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.diagnoses.map((d, i) => (
                    <Badge key={i} variant="default" size="sm">{d}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No additional diagnoses</p>
              )}
            </Card>

            {/* Allergies */}
            <Card padding="md">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={16} className="text-red-500" />
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Allergies
                </h3>
              </div>
              {patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((a, i) => (
                    <Badge key={i} variant="critical" size="sm">{a}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-600 font-medium">NKDA (No Known Drug Allergies)</p>
              )}
            </Card>

            {/* Code Status */}
            <Card padding="md">
              <div className="flex items-center gap-2 mb-3">
                <Heart size={16} className="text-pink-500" />
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Code Status
                </h3>
              </div>
              <Badge
                variant={patient.codeStatus === 'full' ? 'success' : patient.codeStatus === 'comfort' ? 'warning' : 'critical'}
                size="md"
              >
                {patient.codeStatus === 'full' ? 'Full Code' : patient.codeStatus.toUpperCase()}
              </Badge>
            </Card>

            {/* Notes */}
            {patient.notes && (
              <Card padding="md">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Notes
                </h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{patient.notes}</p>
              </Card>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {historyLoading ? (
              <div className="py-16">
                <Spinner size="lg" label="Loading patient history..." />
              </div>
            ) : !history ? (
              <Card>
                <EmptyState
                  icon={<Activity size={24} />}
                  title="No history recorded"
                  description="Patient history has not been documented yet."
                />
              </Card>
            ) : (
              <>
                {/* HPI */}
                <Card padding="md">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    History of Presenting Illness
                  </h3>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {history.hpiText || 'Not documented'}
                  </p>
                </Card>

                {/* PMH */}
                <Card padding="md">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Past Medical History
                  </h3>
                  {history.pmh.length > 0 ? (
                    <ul className="space-y-2">
                      {history.pmh.map((entry, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <ChevronRight size={14} className="mt-0.5 text-slate-400 shrink-0" />
                          <div>
                            <span className="font-medium text-slate-900">{entry.condition}</span>
                            {entry.status && (
                              <Badge variant={entry.status === 'active' ? 'warning' : 'success'} size="sm" className="ml-2">
                                {entry.status}
                              </Badge>
                            )}
                            {entry.notes && <p className="text-slate-500 text-xs mt-0.5">{entry.notes}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">No past medical history recorded</p>
                  )}
                </Card>

                {/* PSH */}
                <Card padding="md">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Past Surgical History
                  </h3>
                  {history.psh.length > 0 ? (
                    <ul className="space-y-2">
                      {history.psh.map((entry, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <ChevronRight size={14} className="mt-0.5 text-slate-400 shrink-0" />
                          <span className="text-slate-900">
                            {entry.procedure}
                            {entry.year && <span className="text-slate-500 ml-1">({entry.year})</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">No past surgical history recorded</p>
                  )}
                </Card>

                {/* Medications */}
                <Card padding="md">
                  <div className="flex items-center gap-2 mb-3">
                    <Pill size={16} className="text-blue-500" />
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                      Medications
                    </h3>
                  </div>
                  {history.medications.length > 0 ? (
                    <div className="space-y-2">
                      {history.medications.map((med, i) => (
                        <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0">
                          <div>
                            <span className="font-medium text-slate-900">{med.name}</span>
                            {med.dose && <span className="text-slate-500 ml-1">{med.dose}</span>}
                            {med.frequency && <span className="text-slate-500 ml-1">{med.frequency}</span>}
                            {med.route && <span className="text-slate-500 ml-1">({med.route})</span>}
                          </div>
                          <Badge
                            variant={med.status === 'active' ? 'success' : med.status === 'prn' ? 'info' : 'muted'}
                            size="sm"
                          >
                            {med.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No medications recorded</p>
                  )}
                </Card>

                {/* Family History */}
                <Card padding="md">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Family History
                  </h3>
                  {history.familyHistory.length > 0 ? (
                    <ul className="space-y-2">
                      {history.familyHistory.map((entry, i) => (
                        <li key={i} className="text-sm text-slate-700">
                          <span className="font-medium">{entry.relation}:</span> {entry.condition}
                          {entry.notes && <span className="text-slate-500 ml-1">- {entry.notes}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">No family history recorded</p>
                  )}
                </Card>

                {/* Social History */}
                <Card padding="md">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Social History
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Smoking', value: history.socialHistory.smoking },
                      { label: 'Alcohol', value: history.socialHistory.alcohol },
                      { label: 'Occupation', value: history.socialHistory.occupation },
                      { label: 'Living Situation', value: history.socialHistory.livingSituation },
                      { label: 'Substances', value: history.socialHistory.substances },
                    ]
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.label}>
                          <p className="text-xs text-slate-500">{item.label}</p>
                          <p className="text-sm text-slate-900">{item.value}</p>
                        </div>
                      ))}
                  </div>
                </Card>
              </>
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
                          task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900',
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
        onClose={() => setShowEditModal(false)}
        title="Edit Patient"
        size="lg"
      >
        <form onSubmit={handleEditPatient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={editForm.firstName || ''}
              onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={editForm.lastName || ''}
              onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="MRN"
              value={editForm.mrn || ''}
              onChange={(e) => setEditForm({ ...editForm, mrn: e.target.value })}
              required
            />
            <Input
              label="Date of Birth"
              type="date"
              value={editForm.dateOfBirth || ''}
              onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Gender"
              value={editForm.gender || 'male'}
              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as PatientFormData['gender'] })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
            <Input
              label="Ward"
              value={editForm.wardId || ''}
              onChange={(e) => setEditForm({ ...editForm, wardId: e.target.value })}
              placeholder="e.g. 4A, ICU-1"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Bed Number"
              value={editForm.bedNumber || ''}
              onChange={(e) => setEditForm({ ...editForm, bedNumber: e.target.value })}
              required
            />
            <Select
              label="Acuity"
              value={String(editForm.acuity || 3)}
              onChange={(e) => setEditForm({ ...editForm, acuity: Number(e.target.value) as PatientFormData['acuity'] })}
            >
              <option value="1">1 - Critical</option>
              <option value="2">2 - Acute</option>
              <option value="3">3 - Moderate</option>
              <option value="4">4 - Stable</option>
              <option value="5">5 - Discharge Ready</option>
            </Select>
          </div>
          <Input
            label="Primary Diagnosis"
            value={editForm.primaryDiagnosis || ''}
            onChange={(e) => setEditForm({ ...editForm, primaryDiagnosis: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Code Status"
              value={editForm.codeStatus || 'full'}
              onChange={(e) => setEditForm({ ...editForm, codeStatus: e.target.value as PatientFormData['codeStatus'] })}
            >
              <option value="full">Full Code</option>
              <option value="DNR">DNR</option>
              <option value="DNI">DNI</option>
              <option value="comfort">Comfort Only</option>
            </Select>
            <Input
              label="Attending Physician"
              value={editForm.attendingPhysician || ''}
              onChange={(e) => setEditForm({ ...editForm, attendingPhysician: e.target.value })}
            />
          </div>
          <Input
            label="Team"
            value={editForm.team || ''}
            onChange={(e) => setEditForm({ ...editForm, team: e.target.value })}
          />
          <Textarea
            label="Notes"
            value={editForm.notes || ''}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
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

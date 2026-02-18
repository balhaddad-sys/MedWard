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
} from 'lucide-react';
import { format } from 'date-fns';
import { usePatientStore } from '@/stores/patientStore';
import { useTaskStore } from '@/stores/taskStore';
import { useAuthStore } from '@/stores/authStore';
import {
  updatePatient as updatePatientFirebase,
  deletePatient as deletePatientFirebase,
} from '@/services/firebase/patients';
import { completeTask } from '@/services/firebase/tasks';
import { getPatientHistory } from '@/services/firebase/history';
import { getLabPanels } from '@/services/firebase/labs';
import { ACUITY_LEVELS } from '@/config/constants';
import { STATE_METADATA } from '@/types/patientState';
import type { Patient, PatientFormData } from '@/types/patient';
import type { PatientHistory } from '@/types/history';
import type { LabPanel, LabFlag } from '@/types/lab';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card padding="lg" className="text-center max-w-sm">
          <AlertCircle size={40} className="mx-auto text-gray-400 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900">Patient Not Found</h2>
          <p className="text-sm text-gray-500 mt-1 mb-4">
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
      default: return 'text-gray-600';
    }
  }

  function getLabFlagBadge(flag: LabFlag) {
    switch (flag) {
      case 'normal': return null;
      case 'low': return <Badge variant="info" size="sm">Low</Badge>;
      case 'high': return <Badge variant="warning" size="sm">High</Badge>;
      case 'critical_low': return <Badge variant="critical" size="sm">Critical Low</Badge>;
      case 'critical_high': return <Badge variant="critical" size="sm">Critical High</Badge>;
      default: return null;
    }
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

  const tabItems = [
    { id: 'overview', label: 'Overview', icon: <User size={16} /> },
    { id: 'history', label: 'History', icon: <Activity size={16} /> },
    { id: 'labs', label: 'Labs', icon: <Beaker size={16} /> },
    { id: 'tasks', label: 'Tasks', icon: <ClipboardList size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/patients')}
              iconLeft={<ArrowLeft size={16} />}
            >
              Patients
            </Button>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {patient.firstName} {patient.lastName}
                </h1>
                <Badge variant={getAcuityVariant(patient.acuity)} dot>
                  {ACUITY_LEVELS[patient.acuity].label}
                </Badge>
                {patient.state && (
                  <Badge variant={getStateVariant(patient.state)}>
                    {STATE_METADATA[patient.state]?.label || patient.state}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                MRN: {patient.mrn} &middot; Bed {patient.bedNumber} &middot;{' '}
                {patient.gender === 'male' ? 'Male' : patient.gender === 'female' ? 'Female' : 'Other'}{' '}
                &middot; DOB: {patient.dateOfBirth}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEditModal(true)}
                iconLeft={<Edit3 size={14} />}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                iconLeft={<Trash2 size={14} />}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} className="mb-6" />

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Demographics */}
            <Card padding="md">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
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
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Diagnoses */}
            <Card padding="md">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Diagnoses
              </h3>
              <p className="text-sm font-medium text-gray-900 mb-2">
                Primary: {patient.primaryDiagnosis}
              </p>
              {patient.diagnoses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.diagnoses.map((d, i) => (
                    <Badge key={i} variant="default" size="sm">{d}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No additional diagnoses</p>
              )}
            </Card>

            {/* Allergies */}
            <Card padding="md">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={16} className="text-red-500" />
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
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
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
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
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Notes
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{patient.notes}</p>
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
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    History of Presenting Illness
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {history.hpiText || 'Not documented'}
                  </p>
                </Card>

                {/* PMH */}
                <Card padding="md">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Past Medical History
                  </h3>
                  {history.pmh.length > 0 ? (
                    <ul className="space-y-2">
                      {history.pmh.map((entry, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <ChevronRight size={14} className="mt-0.5 text-gray-400 shrink-0" />
                          <div>
                            <span className="font-medium text-gray-900">{entry.condition}</span>
                            {entry.status && (
                              <Badge variant={entry.status === 'active' ? 'warning' : 'success'} size="sm" className="ml-2">
                                {entry.status}
                              </Badge>
                            )}
                            {entry.notes && <p className="text-gray-500 text-xs mt-0.5">{entry.notes}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">No past medical history recorded</p>
                  )}
                </Card>

                {/* PSH */}
                <Card padding="md">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Past Surgical History
                  </h3>
                  {history.psh.length > 0 ? (
                    <ul className="space-y-2">
                      {history.psh.map((entry, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <ChevronRight size={14} className="mt-0.5 text-gray-400 shrink-0" />
                          <span className="text-gray-900">
                            {entry.procedure}
                            {entry.year && <span className="text-gray-500 ml-1">({entry.year})</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">No past surgical history recorded</p>
                  )}
                </Card>

                {/* Medications */}
                <Card padding="md">
                  <div className="flex items-center gap-2 mb-3">
                    <Pill size={16} className="text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Medications
                    </h3>
                  </div>
                  {history.medications.length > 0 ? (
                    <div className="space-y-2">
                      {history.medications.map((med, i) => (
                        <div key={i} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                          <div>
                            <span className="font-medium text-gray-900">{med.name}</span>
                            {med.dose && <span className="text-gray-500 ml-1">{med.dose}</span>}
                            {med.frequency && <span className="text-gray-500 ml-1">{med.frequency}</span>}
                            {med.route && <span className="text-gray-500 ml-1">({med.route})</span>}
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
                    <p className="text-sm text-gray-400">No medications recorded</p>
                  )}
                </Card>

                {/* Family History */}
                <Card padding="md">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Family History
                  </h3>
                  {history.familyHistory.length > 0 ? (
                    <ul className="space-y-2">
                      {history.familyHistory.map((entry, i) => (
                        <li key={i} className="text-sm text-gray-700">
                          <span className="font-medium">{entry.relation}:</span> {entry.condition}
                          {entry.notes && <span className="text-gray-500 ml-1">- {entry.notes}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">No family history recorded</p>
                  )}
                </Card>

                {/* Social History */}
                <Card padding="md">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
                          <p className="text-xs text-gray-500">{item.label}</p>
                          <p className="text-sm text-gray-900">{item.value}</p>
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
              labs.map((panel) => (
                <Card key={panel.id} padding="md">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{panel.panelName}</h3>
                      <p className="text-xs text-gray-500">
                        {panel.category} &middot;{' '}
                        {panel.collectedAt && typeof panel.collectedAt === 'object' && 'toDate' in panel.collectedAt
                          ? format(panel.collectedAt.toDate(), 'MMM d, yyyy HH:mm')
                          : 'Date unknown'}
                      </p>
                    </div>
                    <Badge
                      variant={panel.status === 'reviewed' ? 'success' : panel.status === 'resulted' ? 'info' : 'muted'}
                      size="sm"
                    >
                      {panel.status}
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">Test</th>
                          <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">Value</th>
                          <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Unit</th>
                          <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Reference</th>
                          <th className="text-left py-2 pl-4 text-xs font-medium text-gray-500">Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panel.values.map((val, vi) => (
                          <tr
                            key={vi}
                            className={clsx(
                              'border-b border-gray-50',
                              (val.flag === 'critical_low' || val.flag === 'critical_high') && 'bg-red-50',
                            )}
                          >
                            <td className="py-2 pr-4 font-medium text-gray-900">{val.name}</td>
                            <td className={clsx('py-2 px-4 text-right tabular-nums', getLabFlagColor(val.flag))}>
                              {val.value}
                              {val.previousValue !== undefined && (
                                <span className="text-xs text-gray-400 ml-1">
                                  (prev: {val.previousValue})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-gray-500">{val.unit}</td>
                            <td className="py-2 px-4 text-gray-500 text-xs">
                              {val.referenceMin !== undefined && val.referenceMax !== undefined
                                ? `${val.referenceMin} - ${val.referenceMax}`
                                : 'N/A'}
                            </td>
                            <td className="py-2 pl-4">{getLabFlagBadge(val.flag)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {panel.aiAnalysis && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-medium text-blue-700 mb-1">AI Analysis</p>
                      <p className="text-sm text-blue-900">{panel.aiAnalysis.summary}</p>
                    </div>
                  )}
                </Card>
              ))
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
                          task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900',
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
                        <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <p className="text-sm text-gray-700">
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

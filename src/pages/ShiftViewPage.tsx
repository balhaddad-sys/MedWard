import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Clock,
  AlertTriangle,
  Beaker,
  Activity,
  CheckCircle2,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePatientStore } from '@/stores/patientStore';
import { useTaskStore } from '@/stores/taskStore';
import { useAuthStore } from '@/stores/authStore';
import { completeTask } from '@/services/firebase/tasks';
import { ACUITY_LEVELS } from '@/config/constants';
import type { Task } from '@/types/task';
import type { Patient } from '@/types/patient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ShiftViewPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const patients = usePatientStore((s) => s.patients);
  const labPanels = usePatientStore((s) => s.labPanels);
  const tasks = useTaskStore((s) => s.tasks);

  const [completingTask, setCompletingTask] = useState<string | null>(null);

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => {
      if (t.status === 'completed' || t.status === 'cancelled') return false;
      if (!t.dueAt) return false;
      const due =
        typeof t.dueAt === 'object' && 'toDate' in t.dueAt
          ? t.dueAt.toDate()
          : new Date(t.dueAt as unknown as string);
      return due < now;
    }).sort((a, b) => {
      // Sort by priority then by due date
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
  }, [tasks]);

  // Patients with critical lab values
  const criticalLabPatients = useMemo(() => {
    const result: { patient: Patient; criticalCount: number }[] = [];
    patients.forEach((patient) => {
      const panels = labPanels[patient.id] || [];
      let criticalCount = 0;
      panels.forEach((panel) => {
        (panel.values || []).forEach((val) => {
          if (val.flag === 'critical_low' || val.flag === 'critical_high') {
            criticalCount++;
          }
        });
      });
      if (criticalCount > 0) {
        result.push({ patient, criticalCount });
      }
    });
    return result.sort((a, b) => b.criticalCount - a.criticalCount);
  }, [patients, labPanels]);

  // Unstable patients
  const unstablePatients = useMemo(() => {
    return patients.filter((p) => p.state === 'unstable').sort((a, b) => a.acuity - b.acuity);
  }, [patients]);

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

  function getTimeOverdue(task: Task): string {
    if (!task.dueAt) return '';
    try {
      const due =
        typeof task.dueAt === 'object' && 'toDate' in task.dueAt
          ? task.dueAt.toDate()
          : new Date(task.dueAt as unknown as string);
      return formatDistanceToNow(due, { addSuffix: true });
    } catch {
      return '';
    }
  }

  const isEmpty = overdueTasks.length === 0 && criticalLabPatients.length === 0 && unstablePatients.length === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <Zap size={20} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Shift View</h1>
              <p className="text-sm text-slate-500">
                Action-focused overview of items requiring immediate attention
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {isEmpty ? (
          <Card>
            <EmptyState
              icon={<Shield size={24} />}
              title="All clear"
              description="No overdue tasks, critical labs, or unstable patients at this time. Keep up the great work."
            />
          </Card>
        ) : (
          <>
            {/* Section 1: Overdue Tasks */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={18} className="text-red-500" />
                <h2 className="text-lg font-semibold text-slate-900">Overdue Tasks</h2>
                <Badge variant="critical" size="sm">{overdueTasks.length}</Badge>
              </div>

              {overdueTasks.length === 0 ? (
                <Card padding="md">
                  <p className="text-sm text-slate-500 text-center py-4">
                    No overdue tasks. All tasks are on track.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {overdueTasks.map((task) => (
                    <Card
                      key={task.id}
                      padding="md"
                      className="border-red-200 bg-red-50/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                            <Badge
                              variant={
                                task.priority === 'critical' ? 'critical' :
                                task.priority === 'high' ? 'warning' : 'default'
                              }
                              size="sm"
                            >
                              {task.priority}
                            </Badge>
                            <Badge variant="critical" size="sm">
                              <Clock size={10} className="mr-0.5" />
                              Overdue {getTimeOverdue(task)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>{task.patientName}</span>
                            <span>Bed {task.bedNumber}</span>
                            <span className="capitalize">{task.category}</span>
                          </div>
                        </div>
                        <Button
                          variant="success"
                          size="sm"
                          loading={completingTask === task.id}
                          onClick={() => handleCompleteTask(task.id)}
                          iconLeft={<CheckCircle2 size={14} />}
                        >
                          Done
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Section 2: Critical Labs */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Beaker size={18} className="text-amber-500" />
                <h2 className="text-lg font-semibold text-slate-900">Critical Labs</h2>
                <Badge variant="warning" size="sm">{criticalLabPatients.length}</Badge>
              </div>

              {criticalLabPatients.length === 0 ? (
                <Card padding="md">
                  <p className="text-sm text-slate-500 text-center py-4">
                    No critical lab values detected.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {criticalLabPatients.map(({ patient, criticalCount }) => (
                    <Card
                      key={patient.id}
                      padding="md"
                      hover
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className="border-amber-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                            <AlertTriangle size={16} className="text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="text-xs text-slate-500">
                              MRN: {patient.mrn} &middot; Bed {patient.bedNumber} &middot;{' '}
                              {patient.primaryDiagnosis}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="critical" size="sm">
                            {criticalCount} critical value{criticalCount !== 1 ? 's' : ''}
                          </Badge>
                          <ArrowRight size={14} className="text-slate-400" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Section 3: Unstable Patients */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-red-500" />
                <h2 className="text-lg font-semibold text-slate-900">Unstable Patients</h2>
                <Badge variant="critical" size="sm">{unstablePatients.length}</Badge>
              </div>

              {unstablePatients.length === 0 ? (
                <Card padding="md">
                  <p className="text-sm text-slate-500 text-center py-4">
                    No unstable patients at this time.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {unstablePatients.map((patient) => (
                    <Card
                      key={patient.id}
                      padding="md"
                      hover
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className="border-red-200 bg-red-50/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-red-100 rounded-lg shrink-0">
                            <Activity size={16} className="text-red-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">
                                {patient.firstName} {patient.lastName}
                              </p>
                              <Badge
                                variant={patient.acuity <= 2 ? 'critical' : 'warning'}
                                dot
                                size="sm"
                              >
                                {ACUITY_LEVELS[patient.acuity].label}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                              MRN: {patient.mrn} &middot; Bed {patient.bedNumber} &middot;{' '}
                              {patient.primaryDiagnosis}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="critical" size="sm">Unstable</Badge>
                          <ArrowRight size={14} className="text-slate-400" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

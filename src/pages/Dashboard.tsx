import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Users,
  AlertTriangle,
  ClipboardList,
  Clock,
  Plus,
  FileText,
  Beaker,
  Phone,
  ArrowRight,
  Activity,
  Stethoscope,
  LayoutDashboard,
} from 'lucide-react';
import { usePatientStore } from '@/stores/patientStore';
import { useTaskStore } from '@/stores/taskStore';
import { useModeContext } from '@/context/ModeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ACUITY_LEVELS } from '@/config/constants';

interface StatCard {
  label: string;
  value: number;
  icon: typeof Users;
  color: string;
  bgColor: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { mode, modeConfig } = useModeContext();
  const patients = usePatientStore((s) => s.patients);
  const tasks = useTaskStore((s) => s.tasks);

  const stats = useMemo(() => {
    const totalPatients = patients.length;
    const criticalPatients = patients.filter((p) => p.acuity === 1 || p.acuity === 2).length;
    const pendingTasks = tasks.filter(
      (t) => t.status === 'pending' || t.status === 'in_progress'
    ).length;
    const overdueTasks = tasks.filter((t) => {
      if (t.status === 'completed' || t.status === 'cancelled') return false;
      if (!t.dueAt) return false;
      const due = typeof t.dueAt === 'object' && 'toDate' in t.dueAt
        ? t.dueAt.toDate()
        : new Date(t.dueAt as unknown as string);
      return due < new Date();
    }).length;

    return { totalPatients, criticalPatients, pendingTasks, overdueTasks };
  }, [patients, tasks]);

  const statCards: StatCard[] = [
    {
      label: 'Total Patients',
      value: stats.totalPatients,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Critical / Acute',
      value: stats.criticalPatients,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Pending Tasks',
      value: stats.pendingTasks,
      icon: ClipboardList,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Overdue Tasks',
      value: stats.overdueTasks,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  const quickActions = useMemo(() => {
    const baseActions = [
      { label: 'Add Patient', icon: Plus, path: '/patients', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
      { label: 'View Tasks', icon: ClipboardList, path: '/tasks', color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300' },
      { label: 'Lab Analysis', icon: Beaker, path: '/labs', color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300' },
      { label: 'Handover', icon: FileText, path: '/handover', color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300' },
    ];

    if (mode === 'acute') {
      baseActions.splice(1, 0, {
        label: 'On-Call List',
        icon: Phone,
        path: '/on-call',
        color: 'bg-red-600 hover:bg-red-700 text-white',
      });
    }

    if (mode === 'clerking') {
      baseActions.splice(1, 0, {
        label: 'New Clerking',
        icon: Stethoscope,
        path: '/clerking',
        color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      });
    }

    return baseActions;
  }, [mode]);

  function getAcuityVariant(acuity: 1 | 2 | 3 | 4 | 5) {
    switch (acuity) {
      case 1: return 'critical' as const;
      case 2: return 'warning' as const;
      case 3: return 'default' as const;
      case 4: return 'success' as const;
      case 5: return 'info' as const;
    }
  }

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => a.acuity - b.acuity).slice(0, 10);
  }, [patients]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <LayoutDashboard size={24} className="text-gray-400" />
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {modeConfig.label} mode &mdash; {modeConfig.description}
              </p>
            </div>
            <Badge
              variant={mode === 'ward' ? 'info' : mode === 'acute' ? 'critical' : 'success'}
              dot
            >
              {modeConfig.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} padding="md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={clsx('p-2.5 rounded-xl', stat.bgColor)}>
                    <Icon size={20} className={stat.color} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className={clsx(
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium',
                    'transition-colors duration-150',
                    action.color,
                  )}
                >
                  <Icon size={16} />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Acute mode shift alert */}
        {mode === 'acute' && (
          <Card padding="md" className="border-red-200 bg-red-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Phone size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">On-Call Shift View</p>
                  <p className="text-sm text-gray-500">
                    View overdue tasks, critical labs, and unstable patients at a glance
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => navigate('/shift')}
                iconRight={<ArrowRight size={14} />}
              >
                Open Shift View
              </Button>
            </div>
          </Card>
        )}

        {/* Patient list overview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {mode === 'ward' ? 'Your Patients' : 'Recent Patients'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/patients')}
              iconRight={<ArrowRight size={14} />}
            >
              View All
            </Button>
          </div>

          {sortedPatients.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Users size={24} />}
                title="No patients yet"
                description="Add your first patient to get started with MedWard Pro."
                action={
                  <Button
                    size="sm"
                    onClick={() => navigate('/patients')}
                    iconLeft={<Plus size={14} />}
                  >
                    Add Patient
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {sortedPatients.map((patient) => (
                <Card
                  key={patient.id}
                  padding="sm"
                  hover
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={getAcuityVariant(patient.acuity)} dot size="sm">
                        {ACUITY_LEVELS[patient.acuity].label}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        MRN: {patient.mrn} &middot; Bed {patient.bedNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-xs text-gray-500 hidden sm:block truncate max-w-[200px]">
                      {patient.primaryDiagnosis}
                    </p>
                    <ArrowRight size={14} className="text-gray-400" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent tasks */}
        {tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Active Tasks
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/tasks')}
                iconRight={<ArrowRight size={14} />}
              >
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {tasks
                .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
                .slice(0, 5)
                .map((task) => (
                  <Card key={task.id} padding="sm" hover onClick={() => navigate('/tasks')}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge
                          variant={
                            task.priority === 'critical'
                              ? 'critical'
                              : task.priority === 'high'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {task.priority}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {task.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {task.patientName} &middot; Bed {task.bedNumber}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={task.status === 'in_progress' ? 'info' : 'muted'}
                        size="sm"
                      >
                        {task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                      </Badge>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

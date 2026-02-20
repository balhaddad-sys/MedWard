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
  Stethoscope,
  LayoutDashboard,
  Activity,
  ShieldAlert,
  CheckCircle2,
  TrendingDown,
  Pill,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePatientStore } from '@/stores/patientStore';
import { useTaskStore } from '@/stores/taskStore';
import { useAuthStore } from '@/stores/authStore';
import { useModeContext } from '@/context/useModeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ACUITY_LEVELS } from '@/config/constants';

// ---------------------------------------------------------------------------
// Acuity left-border colors for patient cards
// ---------------------------------------------------------------------------

const ACUITY_BORDER: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'border-l-4 border-l-red-500',
  2: 'border-l-4 border-l-orange-400',
  3: 'border-l-4 border-l-yellow-400',
  4: 'border-l-4 border-l-emerald-400',
  5: 'border-l-4 border-l-blue-400',
};

const ACUITY_BG: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'bg-red-50',
  2: 'bg-orange-50',
  3: '',
  4: '',
  5: '',
};

// ---------------------------------------------------------------------------
// Helper: calculate patient age
// ---------------------------------------------------------------------------

function calculateAge(dob: string): string {
  if (!dob) return '';
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age}y`;
}

// ---------------------------------------------------------------------------
// Dashboard component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const navigate = useNavigate();
  const { mode, modeConfig } = useModeContext();
  const patients = usePatientStore((s) => s.patients);
  const tasks = useTaskStore((s) => s.tasks);
  const user = useAuthStore((s) => s.user);

  const stats = useMemo(() => {
    const totalPatients = patients.length;
    const criticalPatients = patients.filter((p) => p.acuity === 1).length;
    const acutePatients = patients.filter((p) => p.acuity === 2).length;
    const stablePatients = patients.filter((p) => p.acuity >= 4).length;
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
    const criticalTasks = tasks.filter(
      (t) => t.priority === 'critical' && t.status !== 'completed' && t.status !== 'cancelled'
    ).length;

    return { totalPatients, criticalPatients, acutePatients, stablePatients, pendingTasks, overdueTasks, criticalTasks };
  }, [patients, tasks]);

  // Quick actions
  const quickActions = useMemo(() => {
    const baseActions = [
      { label: 'Add Patient', icon: Plus, path: '/patients', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
      { label: 'Lab Analysis', icon: Beaker, path: '/labs', color: 'bg-white hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-300' },
      { label: 'Drug Info', icon: Pill, path: '/drugs', color: 'bg-white hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-300' },
      { label: 'AI Assistant', icon: Stethoscope, path: '/ai', color: 'bg-white hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-300' },
      { label: 'Handover', icon: FileText, path: '/handover', color: 'bg-white hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-300' },
    ];

    if (mode === 'acute') {
      baseActions.splice(1, 0, {
        label: 'On-Call List',
        icon: Phone,
        path: '/on-call',
        color: 'bg-red-600 hover:bg-red-700 text-white',
      });
      baseActions.splice(2, 0, {
        label: 'Shift View',
        icon: Activity,
        path: '/shift',
        color: 'bg-orange-500 hover:bg-orange-600 text-white',
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

  const sortedPatients = useMemo(
    () => [...patients].sort((a, b) => a.acuity - b.acuity).slice(0, 8),
    [patients]
  );

  const activeTasks = useMemo(
    () => tasks
      .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => {
        const pOrd: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (pOrd[a.priority] ?? 2) - (pOrd[b.priority] ?? 2);
      })
      .slice(0, 5),
    [tasks]
  );

  function isTaskOverdue(task: { dueAt?: unknown; status: string }): boolean {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    if (!task.dueAt) return false;
    const due = typeof task.dueAt === 'object' && task.dueAt !== null && 'toDate' in task.dueAt
      ? (task.dueAt as { toDate: () => Date }).toDate()
      : new Date(task.dueAt as string);
    return due < new Date();
  }

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Good morning' :
    greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* ---- Page header ---- */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard size={20} className="text-slate-400" />
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          </div>
          <p className="text-sm text-slate-500">
            {greeting}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}.&ensp;
            <span className="font-medium text-slate-700 dark:text-slate-200">{modeConfig.label} Mode</span>
            &ensp;&mdash;&ensp;{modeConfig.description}
          </p>
        </div>
      </div>

      {/* ---- Critical patient alert banner ---- */}
      {stats.criticalPatients > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 animate-pulse-critical">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {stats.criticalPatients} critical patient{stats.criticalPatients > 1 ? 's' : ''} require immediate attention
            </p>
            <p className="text-xs text-red-600">Acuity level 1 — critical care</p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => navigate('/patients')}
            iconRight={<ArrowRight size={14} />}
          >
            View Patients
          </Button>
        </div>
      )}

      {/* ---- Overdue task banner ---- */}
      {stats.overdueTasks > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Clock size={18} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {stats.overdueTasks} overdue task{stats.overdueTasks > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-600">Action required — review and complete</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tasks')}
            className="text-amber-700 hover:bg-amber-100"
            iconRight={<ArrowRight size={14} />}
          >
            View Tasks
          </Button>
        </div>
      )}

      {/* ---- Stat cards ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total patients */}
        <Card
          padding="md"
          hover
          onClick={() => navigate('/patients')}
          className="cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Patients</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{stats.totalPatients}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          {stats.totalPatients > 0 && (
            <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
              <span className="text-red-600 font-medium">{stats.criticalPatients} critical</span>
              <span>·</span>
              <span className="text-orange-500 font-medium">{stats.acutePatients} acute</span>
              <span>·</span>
              <span className="text-emerald-600 font-medium">{stats.stablePatients} stable</span>
            </div>
          )}
        </Card>

        {/* Critical/Acute */}
        <Card
          padding="md"
          hover
          onClick={() => navigate('/patients')}
          className={clsx('cursor-pointer', stats.criticalPatients > 0 && 'border-red-200')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Critical / Acute</p>
              <p className={clsx(
                'mt-1 text-3xl font-bold',
                stats.criticalPatients > 0 ? 'text-red-600' : 'text-slate-900',
              )}>
                {stats.criticalPatients + stats.acutePatients}
              </p>
            </div>
            <div className={clsx(
              'p-2.5 rounded-xl',
              stats.criticalPatients > 0 ? 'bg-red-50' : 'bg-orange-50',
            )}>
              <AlertTriangle size={20} className={stats.criticalPatients > 0 ? 'text-red-600' : 'text-orange-500'} />
            </div>
          </div>
          {(stats.criticalPatients + stats.acutePatients) > 0 ? (
            <div className="mt-3 flex items-center gap-1 text-xs">
              <TrendingDown size={11} className="text-red-500" />
              <span className="text-red-600 font-medium">Requires monitoring</span>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 size={11} />
              <span className="font-medium">All patients stable</span>
            </div>
          )}
        </Card>

        {/* Pending tasks */}
        <Card
          padding="md"
          hover
          onClick={() => navigate('/tasks')}
          className="cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Active Tasks</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{stats.pendingTasks}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50">
              <ClipboardList size={20} className="text-amber-600" />
            </div>
          </div>
          {stats.criticalTasks > 0 && (
            <div className="mt-3 flex items-center gap-1 text-xs">
              <ShieldAlert size={11} className="text-red-500" />
              <span className="text-red-600 font-medium">{stats.criticalTasks} critical priority</span>
            </div>
          )}
          {stats.criticalTasks === 0 && stats.pendingTasks > 0 && (
            <div className="mt-3 text-xs text-slate-400">No critical tasks</div>
          )}
        </Card>

        {/* Overdue tasks */}
        <Card
          padding="md"
          hover
          onClick={() => navigate('/tasks')}
          className={clsx('cursor-pointer', stats.overdueTasks > 0 && 'border-orange-200')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Overdue Tasks</p>
              <p className={clsx(
                'mt-1 text-3xl font-bold',
                stats.overdueTasks > 0 ? 'text-orange-600' : 'text-slate-900',
              )}>
                {stats.overdueTasks}
              </p>
            </div>
            <div className={clsx('p-2.5 rounded-xl', stats.overdueTasks > 0 ? 'bg-orange-50' : 'bg-slate-50')}>
              <Clock size={20} className={stats.overdueTasks > 0 ? 'text-orange-600' : 'text-slate-400'} />
            </div>
          </div>
          {stats.overdueTasks === 0 ? (
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 size={11} />
              <span className="font-medium">All tasks on time</span>
            </div>
          ) : (
            <div className="mt-3 text-xs text-orange-600 font-medium">
              Action required
            </div>
          )}
        </Card>
      </div>

      {/* ---- Acute mode shift alert ---- */}
      {mode === 'acute' && (
        <Card padding="md" className="border-red-200 bg-red-50/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <Activity size={20} className="text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">On-Call Shift View</p>
                <p className="text-sm text-slate-500">
                  Unstable patients, overdue tasks, and critical labs at a glance
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

      {/* ---- Quick actions ---- */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.path)}
                className={clsx(
                  'flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium',
                  'transition-all duration-150 active:scale-95',
                  action.color,
                )}
              >
                <Icon size={17} />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Patient list + Active tasks (2-col on large screens) ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {mode === 'ward' ? 'Your Patients' : 'Patients by Acuity'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/patients')}
              iconRight={<ArrowRight size={13} />}
              className="text-xs"
            >
              View All
            </Button>
          </div>

          {sortedPatients.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Users size={24} />}
                title="No patients yet"
                description="Add your first patient to get started."
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
            <div className="space-y-1.5">
              {sortedPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className={clsx(
                    'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl',
                    'bg-ward-card border border-ward-border cursor-pointer',
                    'hover:shadow-sm transition-all duration-150',
                    ACUITY_BORDER[patient.acuity],
                    ACUITY_BG[patient.acuity],
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Acuity circle */}
                    <div className={clsx(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      patient.acuity === 1 ? 'bg-red-100 text-red-700' :
                      patient.acuity === 2 ? 'bg-orange-100 text-orange-700' :
                      patient.acuity === 3 ? 'bg-yellow-100 text-yellow-700' :
                      patient.acuity === 4 ? 'bg-emerald-100 text-emerald-700' :
                      'bg-blue-100 text-blue-700',
                    )}>
                      {patient.acuity}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {patient.lastName}, {patient.firstName}
                        </p>
                        {patient.dateOfBirth && (
                          <span className="text-xs text-slate-400 shrink-0">
                            {calculateAge(patient.dateOfBirth)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Bed <span className="font-medium">{patient.bedNumber}</span>
                        {' '}·{' '}
                        <span className="truncate">{patient.primaryDiagnosis}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {patient.codeStatus && patient.codeStatus !== 'full' && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                        {patient.codeStatus.toUpperCase()}
                      </span>
                    )}
                    <Badge variant={getAcuityVariant(patient.acuity)} size="sm">
                      {ACUITY_LEVELS[patient.acuity].label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Tasks
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/tasks')}
              iconRight={<ArrowRight size={13} />}
              className="text-xs"
            >
              View All
            </Button>
          </div>

          {activeTasks.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ClipboardList size={24} />}
                title="No active tasks"
                description="All tasks are completed or no tasks assigned."
                action={
                  <Button
                    size="sm"
                    onClick={() => navigate('/tasks')}
                    iconLeft={<Plus size={14} />}
                  >
                    Create Task
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-1.5">
              {activeTasks.map((task) => {
                const overdue = isTaskOverdue(task);
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className={clsx(
                      'flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl',
                      'bg-white border cursor-pointer',
                      'hover:shadow-sm transition-all duration-150',
                      overdue
                        ? 'border-red-200 bg-red-50/50 border-l-4 border-l-red-400'
                        : task.priority === 'critical'
                        ? 'border-red-200 border-l-4 border-l-red-500'
                        : task.priority === 'high'
                        ? 'border-amber-200 border-l-4 border-l-amber-400'
                        : 'border-slate-200',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {task.title}
                        </p>
                        {overdue && (
                          <Badge variant="critical" size="sm">Overdue</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {task.patientName} · Bed {task.bedNumber}
                      </p>
                      {task.dueAt && (
                        <p className={clsx(
                          'text-xs mt-0.5 flex items-center gap-1',
                          overdue ? 'text-red-600 font-medium' : 'text-slate-400',
                        )}>
                          <Clock size={10} />
                          {typeof task.dueAt === 'object' && 'toDate' in task.dueAt
                            ? formatDistanceToNow(task.dueAt.toDate(), { addSuffix: true })
                            : 'N/A'}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        task.priority === 'critical' ? 'critical' :
                        task.priority === 'high' ? 'warning' :
                        'default'
                      }
                      size="sm"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                );
              })}
              {tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length > 5 && (
                <button
                  type="button"
                  onClick={() => navigate('/tasks')}
                  className="w-full text-center text-xs text-blue-600 hover:text-blue-700 py-2 font-medium"
                >
                  +{tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length - 5} more tasks →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

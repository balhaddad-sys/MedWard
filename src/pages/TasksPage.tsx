import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { clsx } from 'clsx';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  Pill,
  FlaskConical,
  Image,
  Stethoscope,
  Activity,
  HeartPulse,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useTaskStore } from '@/stores/taskStore';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { subscribeToUserTasks, createTask, completeTask } from '@/services/firebase/tasks';
import { TASK_STATUSES } from '@/config/constants';
import type { TaskFormData, TaskCategory, TaskPriority, TaskStatus } from '@/types/task';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusFilters: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const priorityFilters: { value: TaskPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const categories: { value: TaskCategory; label: string }[] = [
  { value: 'medication', label: 'Medication' },
  { value: 'lab', label: 'Lab' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'consult', label: 'Consult' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'discharge', label: 'Discharge' },
  { value: 'other', label: 'Other' },
];

const initialFormData: TaskFormData = {
  patientId: '',
  title: '',
  description: '',
  category: 'other',
  priority: 'medium',
  assignedTo: '',
  dueAt: '',
  notes: '',
};

// ---------------------------------------------------------------------------
// Category icons
// ---------------------------------------------------------------------------

function CategoryIcon({ category }: { category: TaskCategory }) {
  switch (category) {
    case 'medication': return <Pill size={13} className="text-blue-500" />;
    case 'lab': return <FlaskConical size={13} className="text-purple-500" />;
    case 'imaging': return <Image size={13} className="text-indigo-500" />;
    case 'consult': return <Stethoscope size={13} className="text-emerald-500" />;
    case 'procedure': return <Activity size={13} className="text-orange-500" />;
    case 'nursing': return <HeartPulse size={13} className="text-pink-500" />;
    case 'discharge': return <LogOut size={13} className="text-slate-500" />;
    default: return <HelpCircle size={13} className="text-slate-400" />;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isOverdue(task: { dueAt?: unknown; status: string }): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  if (!task.dueAt) return false;
  const due = typeof task.dueAt === 'object' && task.dueAt !== null && 'toDate' in task.dueAt
    ? (task.dueAt as { toDate: () => Date }).toDate()
    : new Date(task.dueAt as string);
  return due < new Date();
}

function formatDue(dueAt: unknown): string {
  if (!dueAt) return '';
  try {
    const date = typeof dueAt === 'object' && 'toDate' in (dueAt as object)
      ? (dueAt as { toDate: () => Date }).toDate()
      : new Date(dueAt as string);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

function formatDueAbsolute(dueAt: unknown): string {
  if (!dueAt) return '';
  try {
    const date = typeof dueAt === 'object' && 'toDate' in (dueAt as object)
      ? (dueAt as { toDate: () => Date }).toDate()
      : new Date(dueAt as string);
    return format(date, 'dd MMM, HH:mm');
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// TasksPage component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const user = useAuthStore((s) => s.user);
  const patients = usePatientStore((s) => s.patients);
  const {
    tasks,
    loading,
    filterStatus,
    filterPriority,
    setTasks,
    setFilterStatus,
    setFilterPriority,
    getFilteredTasks,
    setLoading,
  } = useTaskStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [groupByPatient, setGroupByPatient] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubscribe = subscribeToUserTasks(user.id, (data) => {
      setTasks(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, setTasks, setLoading]);

  const filteredTasks = getFilteredTasks();

  // Task stats
  const activeCount = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;
  const overdueCount = tasks.filter(isOverdue).length;
  const criticalCount = tasks.filter((t) => t.priority === 'critical' && t.status !== 'completed' && t.status !== 'cancelled').length;

  const sortedTasks = useMemo(() => {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...filteredTasks].sort((a, b) => {
      // Overdue first
      const aOverdue = isOverdue(a) ? -1 : 0;
      const bOverdue = isOverdue(b) ? -1 : 0;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      // Completed to bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      // Then by priority
      return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
    });
  }, [filteredTasks]);

  // Group by patient
  const tasksByPatient = useMemo(() => {
    const groups: Record<string, { patientName: string; bedNumber: string; tasks: typeof sortedTasks }> = {};
    for (const task of sortedTasks) {
      if (!groups[task.patientId]) {
        groups[task.patientId] = {
          patientName: task.patientName,
          bedNumber: task.bedNumber,
          tasks: [],
        };
      }
      groups[task.patientId].tasks.push(task);
    }
    // Sort groups by their most urgent task
    return Object.entries(groups).sort(([, a], [, b]) => {
      const aHasOverdue = a.tasks.some(isOverdue);
      const bHasOverdue = b.tasks.some(isOverdue);
      if (aHasOverdue && !bHasOverdue) return -1;
      if (!aHasOverdue && bHasOverdue) return 1;
      return 0;
    });
  }, [sortedTasks]);

  function getPriorityBorder(priority: string) {
    switch (priority) {
      case 'critical': return 'border-l-red-500';
      case 'high': return 'border-l-orange-400';
      case 'medium': return 'border-l-blue-300';
      default: return 'border-l-slate-200';
    }
  }

  function getPriorityVariant(priority: string) {
    switch (priority) {
      case 'critical': return 'critical' as const;
      case 'high': return 'warning' as const;
      case 'medium': return 'default' as const;
      case 'low': return 'muted' as const;
      default: return 'default' as const;
    }
  }

  function getStatusVariant(status: string) {
    switch (status) {
      case 'completed': return 'success' as const;
      case 'in_progress': return 'info' as const;
      case 'cancelled': return 'muted' as const;
      default: return 'default' as const;
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!formData.patientId) errors.patientId = 'Please select a patient';
    if (!formData.title.trim()) errors.title = 'Title is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!validateForm() || !user) return;

    const selectedPatient = patients.find((p) => p.id === formData.patientId);
    if (!selectedPatient) return;

    setSaving(true);
    try {
      const taskDataToSave = {
        ...formData,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        bedNumber: selectedPatient.bedNumber,
        assignedTo: formData.assignedTo || user.id,
        assignedToName: formData.assignedTo ? '' : user.displayName,
      };
      await createTask(taskDataToSave as TaskFormData, user.id, user.displayName);
      setShowCreateModal(false);
      setFormData(initialFormData);
      setFormErrors({});
    } catch (err) {
      console.error('Error creating task:', err);
      setFormErrors({ general: 'Failed to create task. Please try again.' });
    } finally {
      setSaving(false);
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

  function TaskCard({ task }: { task: typeof sortedTasks[number]; grouped?: boolean }) {
    const overdue = isOverdue(task);
    return (
      <div
        className={clsx(
          'flex items-start justify-between gap-3 px-4 py-3',
          'bg-white border rounded-xl transition-all duration-150 hover:shadow-sm',
          overdue
            ? 'border-red-200 bg-red-50/40 border-l-4 border-l-red-500'
            : task.status === 'completed'
            ? 'border-slate-100 opacity-70'
            : `border-slate-200 border-l-4 ${getPriorityBorder(task.priority)}`,
        )}
      >
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryIcon category={task.category} />
            <p className={clsx(
              'text-sm font-semibold',
              task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900',
            )}>
              {task.title}
            </p>
            {overdue && <Badge variant="critical" size="sm">Overdue</Badge>}
            <Badge variant={getPriorityVariant(task.priority)} size="sm">
              {task.priority}
            </Badge>
            <Badge variant={getStatusVariant(task.status)} size="sm">
              {TASK_STATUSES[task.status]?.label || task.status}
            </Badge>
          </div>

          {/* Patient + category */}
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
            <span className="font-medium text-slate-700">
              {task.patientName}
            </span>
            <span>Bed {task.bedNumber}</span>
            <span className="capitalize text-slate-400">{task.category}</span>
          </div>

          {/* Due time + assignee */}
          <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
            {task.dueAt && (
              <span className={clsx(
                'flex items-center gap-1',
                overdue ? 'text-red-600 font-semibold' : 'text-slate-400',
              )}>
                <Clock size={11} />
                {overdue ? 'Was due ' : 'Due '}
                {formatDue(task.dueAt)}
                <span className="text-slate-300">({formatDueAbsolute(task.dueAt)})</span>
              </span>
            )}
            {task.assignedToName && (
              <span className="text-slate-400">
                → {task.assignedToName}
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description}</p>
          )}
        </div>

        {/* Complete button */}
        {task.status !== 'completed' && task.status !== 'cancelled' && (
          <Button
            variant={overdue ? 'danger' : 'success'}
            size="sm"
            loading={completingTask === task.id}
            onClick={() => handleCompleteTask(task.id)}
            iconLeft={<CheckCircle2 size={13} />}
          >
            Done
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ---- Header ---- */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={20} className="text-slate-400" />
            <h1 className="text-xl font-bold text-slate-900">Tasks</h1>
            {activeCount > 0 && <Badge variant="default" size="sm">{activeCount} active</Badge>}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 font-semibold text-red-600">
                <AlertTriangle size={11} />
                {overdueCount} overdue
              </span>
            )}
            {criticalCount > 0 && (
              <span className="font-semibold text-orange-600">
                {criticalCount} critical priority
              </span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          iconLeft={<Plus size={14} />}
        >
          New Task
        </Button>
      </div>

      {/* ---- Overdue alert banner ---- */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle size={16} className="text-red-600 shrink-0" />
          <p className="text-sm font-semibold text-red-800">
            {overdueCount} overdue task{overdueCount > 1 ? 's' : ''} — review and complete immediately
          </p>
        </div>
      )}

      {/* ---- Filter + group controls ---- */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Status filters */}
        <div className="flex flex-wrap gap-1.5">
          <Filter size={13} className="text-slate-400 self-center shrink-0" />
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setFilterStatus(filter.value)}
              className={clsx(
                'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filterStatus === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
          className={clsx(
            'h-8 px-2.5 pr-7 rounded-lg text-xs font-medium',
            'bg-white border border-slate-300 text-slate-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
            'appearance-none',
          )}
        >
          {priorityFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>{filter.label}</option>
          ))}
        </select>

        {/* Group toggle */}
        <button
          type="button"
          onClick={() => setGroupByPatient(!groupByPatient)}
          className={clsx(
            'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ml-auto',
            groupByPatient
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50',
          )}
        >
          Group by Patient
        </button>
      </div>

      {/* ---- Task list ---- */}
      {loading ? (
        <div className="py-16"><Spinner size="lg" label="Loading tasks..." /></div>
      ) : sortedTasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList size={24} />}
            title={filterStatus !== 'all' || filterPriority !== 'all' ? 'No tasks match your filters' : 'No tasks yet'}
            description={
              filterStatus !== 'all' || filterPriority !== 'all'
                ? 'Try adjusting your filters.'
                : 'Create your first task to start tracking clinical work.'
            }
            action={
              filterStatus === 'all' && filterPriority === 'all' ? (
                <Button size="sm" onClick={() => setShowCreateModal(true)} iconLeft={<Plus size={14} />}>
                  Create Task
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : groupByPatient ? (
        /* ---- Grouped by patient ---- */
        <div className="space-y-4">
          {tasksByPatient.map(([patientId, group]) => {
            const groupOverdueCount = group.tasks.filter(isOverdue).length;
            return (
              <div key={patientId}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">{group.patientName}</span>
                    <span className="text-xs text-slate-400">Bed {group.bedNumber}</span>
                    <Badge variant="default" size="sm">{group.tasks.length}</Badge>
                    {groupOverdueCount > 0 && (
                      <Badge variant="critical" size="sm">{groupOverdueCount} overdue</Badge>
                    )}
                  </div>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="space-y-1.5">
                  {group.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} grouped />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ---- Flat list ---- */
        <div className="space-y-1.5">
          {sortedTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* ---- Create Task Modal ---- */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData(initialFormData);
          setFormErrors({});
        }}
        title="Create New Task"
        size="lg"
      >
        <form onSubmit={handleCreateTask} className="space-y-5">
          {formErrors.general && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{formErrors.general}</p>
            </div>
          )}

          <Select
            label="Patient"
            value={formData.patientId}
            onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
            error={formErrors.patientId}
          >
            <option value="">Select a patient...</option>
            {[...patients]
              .sort((a, b) => a.acuity - b.acuity)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName} — Bed {p.bedNumber} (Acuity {p.acuity})
                </option>
              ))}
          </Select>

          <Input
            label="Task Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={formErrors.title}
            placeholder="e.g. Check morning bloods, chase CXR result..."
            required
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Additional details..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskCategory })}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </Select>

            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
            >
              <option value="critical">Critical — Do immediately</option>
              <option value="high">High — Do within 1 hour</option>
              <option value="medium">Medium — Do today</option>
              <option value="low">Low — When time permits</option>
            </Select>
          </div>

          <Input
            label="Due Date & Time"
            type="datetime-local"
            value={formData.dueAt || ''}
            onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
          />

          <Textarea
            label="Notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes or instructions..."
          />

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setFormData(initialFormData);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} iconLeft={<Plus size={14} />}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

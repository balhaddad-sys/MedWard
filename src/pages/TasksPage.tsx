import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { clsx } from 'clsx';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

  const sortedTasks = useMemo(() => {
    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return [...filteredTasks].sort((a, b) => {
      // Sort completed to bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      // Then by priority
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
  }, [filteredTasks]);

  function getPriorityVariant(priority: string) {
    switch (priority) {
      case 'critical': return 'critical' as const;
      case 'high': return 'warning' as const;
      case 'medium': return 'default' as const;
      case 'low': return 'success' as const;
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

  function isOverdue(task: { dueAt?: unknown; status: string }): boolean {
    if (task.status === 'completed' || task.status === 'cancelled') return false;
    if (!task.dueAt) return false;
    const due = typeof task.dueAt === 'object' && task.dueAt !== null && 'toDate' in task.dueAt
      ? (task.dueAt as { toDate: () => Date }).toDate()
      : new Date(task.dueAt as string);
    return due < new Date();
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList size={24} className="text-gray-400" />
              <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
              <Badge variant="default" size="sm">
                {tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length} active
              </Badge>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              iconLeft={<Plus size={14} />}
            >
              New Task
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status filters */}
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setFilterStatus(filter.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  filterStatus === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Priority filter dropdown */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
            className={clsx(
              'h-9 px-3 pr-8 rounded-full text-sm font-medium',
              'bg-white border border-gray-300 text-gray-600',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
              'appearance-none bg-no-repeat bg-[length:14px_14px] bg-[right_0.5rem_center]',
              'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")]',
            )}
          >
            {priorityFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="py-16">
            <Spinner size="lg" label="Loading tasks..." />
          </div>
        ) : sortedTasks.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ClipboardList size={24} />}
              title={filterStatus !== 'all' || filterPriority !== 'all' ? 'No tasks match your filters' : 'No tasks yet'}
              description={
                filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'Try adjusting your filters to see more tasks.'
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
        ) : (
          <div className="space-y-2">
            {sortedTasks.map((task) => {
              const overdue = isOverdue(task);
              return (
                <Card
                  key={task.id}
                  padding="md"
                  className={clsx(overdue && 'border-red-200 bg-red-50/30')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.status === 'completed' && (
                          <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                        )}
                        <p className={clsx(
                          'text-sm font-semibold',
                          task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900',
                        )}>
                          {task.title}
                        </p>
                        <Badge variant={getPriorityVariant(task.priority)} size="sm">
                          {task.priority}
                        </Badge>
                        <Badge variant={getStatusVariant(task.status)} size="sm">
                          {TASK_STATUSES[task.status]?.label || task.status}
                        </Badge>
                        {overdue && (
                          <Badge variant="critical" size="sm">Overdue</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                        <span>{task.patientName} &middot; Bed {task.bedNumber}</span>
                        <span className="capitalize">{task.category}</span>
                        {task.dueAt && (
                          <span className={clsx('flex items-center gap-1', overdue && 'text-red-600 font-medium')}>
                            <Clock size={12} />
                            {typeof task.dueAt === 'object' && 'toDate' in task.dueAt
                              ? formatDistanceToNow(task.dueAt.toDate(), { addSuffix: true })
                              : 'N/A'}
                          </span>
                        )}
                        {task.assignedToName && (
                          <span>Assigned: {task.assignedToName}</span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
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
              );
            })}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
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
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} - Bed {p.bedNumber}
              </option>
            ))}
          </Select>

          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={formErrors.title}
            placeholder="e.g. Check morning bloods"
            required
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Task details..."
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
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
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
            placeholder="Additional notes..."
          />

          <div className="flex justify-end gap-3 pt-2">
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
            <Button type="submit" loading={saving}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

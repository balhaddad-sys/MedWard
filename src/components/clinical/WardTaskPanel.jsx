import { useState, useRef } from 'react';
import {
  ClipboardList, Plus, Check, Clock, X, ChevronDown, ChevronUp,
  Trash2, Copy, AlertTriangle,
} from 'lucide-react';
import useWardTaskStore from '../../stores/wardTaskStore';
import useUIStore from '../../stores/uiStore';

const TAGS = [
  { value: 'labs', label: 'Labs', color: 'bg-blue-100 text-blue-700' },
  { value: 'imaging', label: 'Imaging', color: 'bg-amber-100 text-amber-700' },
  { value: 'consult', label: 'Consult', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'meds', label: 'Meds', color: 'bg-purple-100 text-purple-700' },
  { value: 'discharge', label: 'Discharge', color: 'bg-emerald-100 text-emerald-700' },
];

const PRIORITIES = [
  { value: 'routine', label: 'Routine', dot: 'bg-neutral-300' },
  { value: 'important', label: 'Important', dot: 'bg-amber-400' },
  { value: 'urgent', label: 'Urgent', dot: 'bg-red-500' },
];

function getTagStyle(tag) {
  return TAGS.find((t) => t.value === tag)?.color || 'bg-neutral-100 text-neutral-600';
}

function getPriorityDot(priority) {
  return PRIORITIES.find((p) => p.value === priority)?.dot || 'bg-neutral-300';
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export default function WardTaskPanel({ patients = [] }) {
  const addToast = useUIStore((s) => s.addToast);
  const tasks = useWardTaskStore((s) => s.tasks);
  const generateHandover = useWardTaskStore((s) => s.generateHandover);

  const handleCopyHandover = () => {
    const text = generateHandover();
    navigator.clipboard.writeText(text).then(() => {
      addToast({ type: 'success', message: 'Handover copied to clipboard' });
    });
  };

  const openTasks = tasks.filter((t) => t.status === 'open');
  const urgentCount = openTasks.filter((t) => t.priority === 'urgent').length;

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-neutral-700">
            {openTasks.length} open tasks
          </span>
          {urgentCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {urgentCount} urgent
            </span>
          )}
        </div>
        <button
          onClick={handleCopyHandover}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Copy className="w-3.5 h-3.5" />
          Handover
        </button>
      </div>

      {/* Patient task cards */}
      {patients.length > 0 ? (
        patients.map((patient) => (
          <PatientTaskCard key={patient.id} patient={patient} />
        ))
      ) : (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 text-center text-sm text-neutral-500">
          No patients loaded. Add patients from the dashboard.
        </div>
      )}
    </div>
  );
}

// ─── Patient Task Card ───────────────────────────────────────────────────────

function PatientTaskCard({ patient }) {
  const tasks = useWardTaskStore((s) => s.tasks);
  const toggleTask = useWardTaskStore((s) => s.toggleTask);
  const removeTask = useWardTaskStore((s) => s.removeTask);
  const clearDoneTasks = useWardTaskStore((s) => s.clearDoneTasks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const patientTasks = tasks.filter((t) => t.patientId === patient.id);
  const openCount = patientTasks.filter((t) => t.status === 'open').length;
  const doneCount = patientTasks.filter((t) => t.status === 'done').length;

  const statusBorder =
    patient.currentStatus === 'Critical'
      ? 'border-l-red-500'
      : patient.currentStatus === 'Watch'
        ? 'border-l-amber-400'
        : 'border-l-blue-400';

  return (
    <div className={`bg-white border border-neutral-200 border-l-4 ${statusBorder} rounded-xl overflow-hidden`}>
      {/* Card header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-900 truncate">{patient.name}</span>
            {patient.currentStatus === 'Critical' && (
              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">CRIT</span>
            )}
          </div>
          <span className="text-xs text-neutral-500">{patient.diagnosis} · {patient.ward}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {openCount > 0 && (
            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              {openCount}
            </span>
          )}
          {collapsed ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronUp className="w-4 h-4 text-neutral-400" />}
        </div>
      </button>

      {/* Task list */}
      {!collapsed && (
        <div className="border-t border-neutral-100">
          <div className="px-4 py-2 space-y-1">
            {patientTasks.length === 0 && (
              <p className="text-xs text-neutral-400 py-2 text-center">No tasks yet</p>
            )}

            {/* Open tasks first, then done, then deferred */}
            {['open', 'deferred', 'done'].map((status) =>
              patientTasks
                .filter((t) => t.status === status)
                .sort((a, b) => {
                  const pri = { urgent: 0, important: 1, routine: 2 };
                  return (pri[a.priority] || 2) - (pri[b.priority] || 2);
                })
                .map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={(newStatus) => toggleTask(task.id, newStatus)}
                    onRemove={() => removeTask(task.id)}
                  />
                ))
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-100 bg-neutral-50/50">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              <Plus className="w-3.5 h-3.5" />
              New Task
            </button>
            {doneCount > 0 && (
              <button
                onClick={() => clearDoneTasks(patient.id)}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
                Clear done ({doneCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add task form */}
      {showAddForm && (
        <AddTaskForm
          patientId={patient.id}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

// ─── Task Row ────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onRemove }) {
  const touchStartX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60) {
      onToggle('deferred');
      if (navigator.vibrate) navigator.vibrate(50);
    } else if (diff < -60) {
      onToggle(task.status === 'done' ? 'open' : 'done');
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const isDone = task.status === 'done';
  const isDeferred = task.status === 'deferred';

  return (
    <div
      className={`flex items-center gap-2.5 py-2 px-1 rounded-lg group transition-all ${
        isDone ? 'opacity-50' : isDeferred ? 'opacity-60 bg-neutral-50' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Priority dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityDot(task.priority)}`} />

      {/* Checkbox */}
      <button
        onClick={() => onToggle(isDone ? 'open' : 'done')}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isDone
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-neutral-300 hover:border-blue-400'
        }`}
      >
        {isDone && <Check className="w-3 h-3" />}
      </button>

      {/* Text */}
      <span className={`text-sm flex-1 min-w-0 ${isDone ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
        {task.text}
      </span>

      {/* Tag badge */}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${getTagStyle(task.tag)}`}>
        {task.tag}
      </span>

      {/* Deferred icon */}
      {isDeferred && <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}

      {/* Delete (hover only) */}
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-300 hover:text-red-500 transition-opacity flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Add Task Form ───────────────────────────────────────────────────────────

function AddTaskForm({ patientId, onClose }) {
  const addTask = useWardTaskStore((s) => s.addTask);
  const addToast = useUIStore((s) => s.addToast);
  const [text, setText] = useState('');
  const [tag, setTag] = useState('labs');
  const [priority, setPriority] = useState('routine');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    addTask(patientId, text.trim(), tag, priority);
    addToast({ type: 'success', message: 'Task added' });
    onClose();
  };

  return (
    <div className="border-t border-neutral-200 bg-blue-50/40 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Task description..."
          autoFocus
          className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
        />

        <div className="flex gap-2">
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm"
          >
            {TAGS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
          >
            Add Task
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-100 text-neutral-600 rounded-lg text-sm font-medium hover:bg-neutral-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import {
  loadTasks,
  addTask,
  toggleTask,
  removeTask,
  generateHandover,
  TASK_TAGS,
  TASK_PRIORITIES,
} from '../engines/wardEngine';
import useUIStore from '../stores/uiStore';

const TAG_COLORS = {
  labs: 'bg-info-blue-bg text-info-blue',
  imaging: 'bg-guarded-amber-bg text-guarded-amber',
  consult: 'bg-trust-blue-50 text-trust-blue',
  meds: 'bg-purple-100 text-purple-700',
  discharge: 'bg-stable-green-bg text-stable-green',
};

const PRIORITY_DOTS = {
  routine: 'text-neutral-300',
  important: 'text-guarded-amber',
  urgent: 'text-critical-red',
};

function TaskRow({ task, onToggle, onRemove }) {
  const touchStartX = useRef(0);
  const rowRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60) onRemove(task.id);
    else if (diff < -60) onToggle(task.id, task.status === 'done' ? 'open' : 'done');
  };

  return (
    <div
      ref={rowRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`flex items-center gap-2.5 py-2.5 px-1 rounded transition-opacity ${
        task.status === 'done' ? 'opacity-50' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={() => onToggle(task.id, task.status === 'done' ? 'open' : 'done')}
        className="w-4.5 h-4.5 accent-trust-blue shrink-0"
      />
      <span
        className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-neutral-400' : 'text-neutral-700'}`}
      >
        {task.text}
      </span>
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TAG_COLORS[task.tag] || 'bg-neutral-100 text-neutral-500'}`}>
        {task.tag}
      </span>
      <span className={`text-lg leading-none ${PRIORITY_DOTS[task.priority]}`}>●</span>
    </div>
  );
}

export default function WardModePage() {
  const [tasks, setTasks] = useState(() => loadTasks());
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTag, setNewTag] = useState('labs');
  const [newPriority, setNewPriority] = useState('routine');
  const [copied, setCopied] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const handleAdd = useCallback(() => {
    if (!newText.trim()) return;
    const updated = addTask(tasks, newText.trim(), newTag, newPriority);
    setTasks(updated);
    setNewText('');
    setNewTag('labs');
    setNewPriority('routine');
    setShowAdd(false);
    if (navigator.vibrate) navigator.vibrate(50);
  }, [tasks, newText, newTag, newPriority]);

  const handleToggle = useCallback(
    (id, status) => {
      setTasks(toggleTask(tasks, id, status));
      if (navigator.vibrate) navigator.vibrate(30);
    },
    [tasks]
  );

  const handleRemove = useCallback(
    (id) => {
      setTasks(removeTask(tasks, id));
    },
    [tasks]
  );

  const handleHandover = useCallback(() => {
    const text = generateHandover(tasks);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (addToast) addToast({ type: 'success', message: 'Handover copied to clipboard' });
    });
  }, [tasks, addToast]);

  const openTasks = tasks.filter((t) => t.status === 'open');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-neutral-900">Ward Tasks</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {openTasks.length} open · {doneTasks.length} done
          </p>
        </div>
        <Button variant="secondary" onClick={handleHandover}>
          {copied ? 'Copied!' : 'Handover'}
        </Button>
      </div>

      {/* Open Tasks */}
      {openTasks.length > 0 ? (
        <Card>
          <h3 className="font-bold text-sm text-neutral-900 mb-2">Open Tasks</h3>
          <div className="divide-y divide-neutral-100">
            {['urgent', 'important', 'routine'].map((priority) => {
              const group = openTasks.filter((t) => t.priority === priority);
              if (group.length === 0) return null;
              return (
                <div key={priority} className="py-1">
                  {group.map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={handleToggle} onRemove={handleRemove} />
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-neutral-400 text-center py-6">No open tasks. Tap + to add one.</p>
        </Card>
      )}

      {/* Completed Tasks */}
      {doneTasks.length > 0 && (
        <Card>
          <h3 className="font-bold text-sm text-neutral-500 mb-2">Completed</h3>
          <div className="divide-y divide-neutral-100">
            {doneTasks.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={handleToggle} onRemove={handleRemove} />
            ))}
          </div>
        </Card>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-trust-blue text-white rounded-full shadow-lg
                   flex items-center justify-center text-2xl font-bold z-30
                   hover:bg-trust-blue-light active:scale-95 transition-all"
      >
        +
      </button>

      {/* Add Task Modal */}
      {showAdd && (
        <Modal open onClose={() => setShowAdd(false)} title="New Task">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-500">Task</label>
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. Chase CT report"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm mt-1
                           focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-500">Tag</label>
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm mt-1 outline-none"
                >
                  {TASK_TAGS.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm mt-1 outline-none"
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full">
              Add Task
            </Button>
          </div>
        </Modal>
      )}

      <p className="text-center text-xs text-neutral-400 pt-2">
        Swipe right to complete · Swipe left to remove
      </p>
    </div>
  );
}

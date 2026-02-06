// Ward Engine — Task persistence & handover generation

let taskId = parseInt(localStorage.getItem('wardTaskId') || '0', 10);

function nextId() {
  taskId++;
  localStorage.setItem('wardTaskId', String(taskId));
  return taskId;
}

export function loadTasks() {
  try {
    const data = localStorage.getItem('wardTasks');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function persist(tasks) {
  localStorage.setItem('wardTasks', JSON.stringify(tasks));
}

export function addTask(tasks, text, tag, priority = 'routine', patientId = null) {
  const task = {
    id: nextId(),
    text,
    tag,
    priority,
    patientId,
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const next = [...tasks, task];
  persist(next);
  return next;
}

export function toggleTask(tasks, taskId, newStatus) {
  const next = tasks.map((t) =>
    t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
  );
  persist(next);
  return next;
}

export function removeTask(tasks, taskId) {
  const next = tasks.filter((t) => t.id !== taskId);
  persist(next);
  return next;
}

export function generateHandover(tasks) {
  const open = tasks.filter((t) => t.status === 'open');
  if (open.length === 0) return 'No open tasks.';

  let handover = `=== SHIFT HANDOVER ===\nTime: ${new Date().toLocaleString()}\n`;

  ['urgent', 'important', 'routine'].forEach((priority) => {
    const group = open.filter((t) => t.priority === priority);
    if (group.length === 0) return;
    handover += `\n${priority.toUpperCase()}:\n`;
    const byTag = {};
    group.forEach((t) => {
      if (!byTag[t.tag]) byTag[t.tag] = [];
      byTag[t.tag].push(t.text);
    });
    Object.entries(byTag).forEach(([tag, texts]) => {
      handover += `  [${tag.toUpperCase()}]\n`;
      texts.forEach((text) => (handover += `    • ${text}\n`));
    });
  });

  return handover;
}

export const TASK_TAGS = ['labs', 'imaging', 'consult', 'meds', 'discharge'];
export const TASK_PRIORITIES = ['routine', 'important', 'urgent'];

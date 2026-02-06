import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dbSave } from '../engines/persistenceLayer';

let nextId = Date.now();

const useWardTaskStore = create(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (patientId, text, tag, priority = 'routine') => {
        const task = {
          id: nextId++,
          patientId,
          text,
          tag,          // labs | imaging | consult | meds | discharge
          priority,     // routine | important | urgent
          status: 'open', // open | done | deferred
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((s) => {
          const updated = [...s.tasks, task];
          // Async persist to IndexedDB (fire-and-forget)
          dbSave('wardTasks', { id: 'all-tasks', data: updated, ts: Date.now() }).catch(() => {});
          return { tasks: updated };
        });

        return task;
      },

      toggleTask: (taskId, newStatus) => {
        set((s) => {
          const updated = s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
              : t
          );
          dbSave('wardTasks', { id: 'all-tasks', data: updated, ts: Date.now() }).catch(() => {});
          return { tasks: updated };
        });
      },

      removeTask: (taskId) => {
        set((s) => {
          const updated = s.tasks.filter((t) => t.id !== taskId);
          dbSave('wardTasks', { id: 'all-tasks', data: updated, ts: Date.now() }).catch(() => {});
          return { tasks: updated };
        });
      },

      clearDoneTasks: (patientId) => {
        set((s) => {
          const updated = s.tasks.filter(
            (t) => !(t.patientId === patientId && t.status === 'done')
          );
          return { tasks: updated };
        });
      },

      getTasksForPatient: (patientId) => {
        return get().tasks.filter((t) => t.patientId === patientId);
      },

      generateHandover: () => {
        const { tasks } = get();
        const openTasks = tasks.filter((t) => t.status === 'open');

        let handover = `=== SHIFT HANDOVER ===\nTime: ${new Date().toLocaleString()}\n`;

        ['urgent', 'important', 'routine'].forEach((priority) => {
          const filtered = openTasks.filter((t) => t.priority === priority);
          if (filtered.length === 0) return;

          handover += `\n${priority.toUpperCase()}:\n`;
          const byTag = {};
          filtered.forEach((t) => {
            if (!byTag[t.tag]) byTag[t.tag] = [];
            byTag[t.tag].push(t.text);
          });

          Object.entries(byTag).forEach(([tag, texts]) => {
            handover += `  [${tag.toUpperCase()}]\n`;
            texts.forEach((text) => {
              handover += `    - ${text}\n`;
            });
          });
        });

        const deferredTasks = tasks.filter((t) => t.status === 'deferred');
        if (deferredTasks.length > 0) {
          handover += `\nDEFERRED:\n`;
          deferredTasks.forEach((t) => {
            handover += `    - [${t.tag}] ${t.text}\n`;
          });
        }

        return handover;
      },
    }),
    {
      name: 'medward-ward-tasks',
    }
  )
);

export default useWardTaskStore;

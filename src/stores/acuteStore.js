import { create } from 'zustand';

let timerId = 0;

const useAcuteStore = create((set, get) => ({
  timers: [],   // { id, label, endTime, seconds }

  startTimer: (label, seconds) => {
    const id = ++timerId;
    const endTime = Date.now() + seconds * 1000;
    set((s) => ({
      timers: [...s.timers, { id, label, endTime, seconds }],
    }));
    return id;
  },

  stopTimer: (id) => {
    set((s) => ({
      timers: s.timers.filter((t) => t.id !== id),
    }));
  },

  clearAllTimers: () => set({ timers: [] }),

  getTimerDisplay: (id) => {
    const timer = get().timers.find((t) => t.id === id);
    if (!timer) return null;

    const remaining = Math.max(0, Math.ceil((timer.endTime - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return {
      display: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      remaining,
      isExpired: remaining === 0,
    };
  },
}));

export default useAcuteStore;

import { create } from 'zustand';
import { getCurrentMode } from '../utils/modeDetector';

const useUIStore = create((set) => ({
  currentMode: getCurrentMode(),    // 'rounds' | 'oncall' | 'default'
  theme: 'light',                   // 'light' | 'dark'
  globalSearchOpen: false,
  toasts: [],

  setMode: (mode) => set({ currentMode: mode }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setGlobalSearchOpen: (open) => set({ globalSearchOpen: open }),

  addToast: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { id: Date.now(), ...toast }],
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export default useUIStore;

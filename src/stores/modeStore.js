import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Clinical Mode Store - Single source of truth for mode state
 * Manages: Ward Mode, Emergency Mode, Clinic Mode
 */

const MODES = {
  WARD: 'ward',
  EMERGENCY: 'emergency',
  CLINIC: 'clinic',
};

const SUBMODES = {
  ward: ['pre-round', 'rounding', 'post-round', 'handover'],
  emergency: ['resus', 'triage', 'monitoring'],
  clinic: ['scheduled', 'walk-in', 'follow-up'],
};

const DEFAULT_SESSIONS = {
  ward: {
    lastPatientOpened: null,
    lastTaskFilter: 'all',
    scrollPosition: 0,
    expandedPatients: [],
  },
  emergency: {
    lastToolUsed: null,
    activeTimers: [],
    lastPatientContext: null,
  },
  clinic: {
    currentSlot: null,
    openPatientTabs: {},
    viewingRange: { start: null, end: null },
  },
};

const useModeStore = create(
  persist(
    (set, get) => ({
      // Current state
      currentMode: MODES.WARD,
      currentSubmode: null,
      isModeLocked: false,

      // Mode context (ephemeral, per-session data)
      modeContext: {
        selectedPatient: null,
        toolScope: 'patient', // 'patient' or 'general'
        openPanels: [],
        criticalAlerts: [],
      },

      // Persisted sessions per mode
      sessions: {
        ward: { ...DEFAULT_SESSIONS.ward },
        emergency: { ...DEFAULT_SESSIONS.emergency },
        clinic: { ...DEFAULT_SESSIONS.clinic },
      },

      // Actions
      setMode: (mode, submode = null) => {
        const state = get();

        // Validate mode
        if (!Object.values(MODES).includes(mode)) {
          console.error(`[ModeStore] Invalid mode: ${mode}`);
          return false;
        }

        // Validate submode if provided
        if (submode && !SUBMODES[mode]?.includes(submode)) {
          console.error(`[ModeStore] Invalid submode: ${submode} for mode: ${mode}`);
          submode = null;
        }

        // Save current session before switching
        if (state.currentMode !== mode) {
          console.log(`[ModeStore] Switching from ${state.currentMode} to ${mode}`);
        }

        set({
          currentMode: mode,
          currentSubmode: submode,
          // Reset context on mode change
          modeContext: {
            ...state.modeContext,
            openPanels: [],
          },
        });

        // Update body data attribute for CSS theming
        document.body.setAttribute('data-mode', mode);

        return true;
      },

      setSubmode: (submode) => {
        const state = get();
        if (submode && !SUBMODES[state.currentMode]?.includes(submode)) {
          console.error(`[ModeStore] Invalid submode: ${submode}`);
          return false;
        }
        set({ currentSubmode: submode });
        return true;
      },

      lockMode: () => set({ isModeLocked: true }),
      unlockMode: () => set({ isModeLocked: false }),
      toggleModeLock: () => set((state) => ({ isModeLocked: !state.isModeLocked })),

      // Context management
      updateContext: (key, value) => {
        set((state) => ({
          modeContext: {
            ...state.modeContext,
            [key]: value,
          },
        }));
      },

      setSelectedPatient: (patient) => {
        set((state) => ({
          modeContext: {
            ...state.modeContext,
            selectedPatient: patient,
          },
        }));
      },

      clearSelectedPatient: () => {
        set((state) => ({
          modeContext: {
            ...state.modeContext,
            selectedPatient: null,
          },
        }));
      },

      addCriticalAlert: (alert) => {
        set((state) => ({
          modeContext: {
            ...state.modeContext,
            criticalAlerts: [...state.modeContext.criticalAlerts, alert],
          },
        }));
      },

      clearCriticalAlerts: () => {
        set((state) => ({
          modeContext: {
            ...state.modeContext,
            criticalAlerts: [],
          },
        }));
      },

      // Session management
      updateSession: (mode, updates) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [mode]: {
              ...state.sessions[mode],
              ...updates,
            },
          },
        }));
      },

      getSession: (mode) => {
        const state = get();
        return state.sessions[mode] || DEFAULT_SESSIONS[mode];
      },

      resetSession: (mode) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [mode]: { ...DEFAULT_SESSIONS[mode] },
          },
        }));
      },

      // Timer management for Emergency mode
      addTimer: (timer) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            emergency: {
              ...state.sessions.emergency,
              activeTimers: [...state.sessions.emergency.activeTimers, timer],
            },
          },
        }));
      },

      updateTimer: (timerId, updates) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            emergency: {
              ...state.sessions.emergency,
              activeTimers: state.sessions.emergency.activeTimers.map((t) =>
                t.id === timerId ? { ...t, ...updates } : t
              ),
            },
          },
        }));
      },

      removeTimer: (timerId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            emergency: {
              ...state.sessions.emergency,
              activeTimers: state.sessions.emergency.activeTimers.filter(
                (t) => t.id !== timerId
              ),
            },
          },
        }));
      },

      // Getters
      getMode: () => get().currentMode,
      getSubmode: () => get().currentSubmode,
      isLocked: () => get().isModeLocked,
      getContext: () => get().modeContext,
    }),
    {
      name: 'medward-mode-store',
      partialize: (state) => ({
        currentMode: state.currentMode,
        currentSubmode: state.currentSubmode,
        isModeLocked: state.isModeLocked,
        sessions: state.sessions,
      }),
    }
  )
);

export { MODES, SUBMODES };
export default useModeStore;

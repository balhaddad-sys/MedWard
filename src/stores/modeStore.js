import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MODES } from '../config/modeConfig';

const useModeStore = create(
  persist(
    (set, get) => ({
      // ── Core State ─────────────────────────────────────────────────────
      currentMode: MODES.WARD,
      previousMode: null,
      isModeLocked: false,
      privacyMode: false,
      isOffline: !navigator.onLine,

      // ── Context ────────────────────────────────────────────────────────
      modeContext: {
        selectedPatient: null,
        toolScope: 'patient',     // 'patient' | 'general'
        openPanels: [],
        criticalAlerts: [],
      },

      // ── Per-Mode Session Data ──────────────────────────────────────────
      sessions: {
        [MODES.WARD]: { lastPatientId: null, lastTab: 'summary', scrollY: 0 },
        [MODES.EMERGENCY]: { lastPatientId: null, lastTool: null, timerStart: null },
        [MODES.CLINIC]: { lastPatientId: null, lastTab: 'summary', scrollY: 0 },
      },

      // ── Actions ────────────────────────────────────────────────────────

      setMode: (mode) => {
        const { currentMode, isModeLocked } = get();
        if (isModeLocked) return false;
        if (!Object.values(MODES).includes(mode)) return false;
        if (mode === currentMode) return false;

        set({
          previousMode: currentMode,
          currentMode: mode,
        });
        return true;
      },

      toggleModeLock: () => set((s) => ({ isModeLocked: !s.isModeLocked })),

      setModeLock: (locked) => set({ isModeLocked: locked }),

      togglePrivacy: () => set((s) => ({ privacyMode: !s.privacyMode })),

      setOffline: (offline) => set({ isOffline: offline }),

      setSelectedPatient: (patient) =>
        set((s) => ({
          modeContext: { ...s.modeContext, selectedPatient: patient },
        })),

      setToolScope: (scope) =>
        set((s) => ({
          modeContext: { ...s.modeContext, toolScope: scope },
        })),

      addCriticalAlert: (alert) =>
        set((s) => ({
          modeContext: {
            ...s.modeContext,
            criticalAlerts: [
              ...s.modeContext.criticalAlerts.filter((a) => a.id !== alert.id),
              { ...alert, timestamp: Date.now() },
            ],
          },
        })),

      dismissAlert: (alertId) =>
        set((s) => ({
          modeContext: {
            ...s.modeContext,
            criticalAlerts: s.modeContext.criticalAlerts.filter((a) => a.id !== alertId),
          },
        })),

      clearAlerts: () =>
        set((s) => ({
          modeContext: { ...s.modeContext, criticalAlerts: [] },
        })),

      // ── Session Management ─────────────────────────────────────────────

      updateSession: (mode, data) =>
        set((s) => ({
          sessions: {
            ...s.sessions,
            [mode]: { ...s.sessions[mode], ...data },
          },
        })),

      getSession: () => {
        const { currentMode, sessions } = get();
        return sessions[currentMode] || {};
      },

      // ── Emergency-Specific ─────────────────────────────────────────────

      startEmergencyTimer: () => {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [MODES.EMERGENCY]: {
              ...s.sessions[MODES.EMERGENCY],
              timerStart: Date.now(),
            },
          },
        }));
      },

      clearEmergencyTimer: () => {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [MODES.EMERGENCY]: {
              ...s.sessions[MODES.EMERGENCY],
              timerStart: null,
            },
          },
        }));
      },

      // ── Reset ──────────────────────────────────────────────────────────

      resetMode: () =>
        set({
          currentMode: MODES.WARD,
          previousMode: null,
          isModeLocked: false,
          modeContext: {
            selectedPatient: null,
            toolScope: 'patient',
            openPanels: [],
            criticalAlerts: [],
          },
        }),
    }),
    {
      name: 'medward-mode-store',
      partialize: (state) => ({
        currentMode: state.currentMode,
        isModeLocked: state.isModeLocked,
        privacyMode: state.privacyMode,
        sessions: state.sessions,
      }),
    }
  )
);

export default useModeStore;

import { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import {
  Settings,
  User,
  Bell,
  Beaker,
  Monitor,
  Info,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  RefreshCw,
  Users,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePatientStore } from '@/stores/patientStore';
import { useModeContext } from '@/context/useModeContext';
import { useSheetIntegrationStore } from '@/stores/sheetIntegrationStore';
import type { ClinicalMode } from '@/config/modes';
import type { LabPriorityProfile, ThemeSetting } from '@/stores/settingsStore';
import { APP_NAME, APP_VERSION } from '@/config/constants';
import { RELEASE_STAGE } from '@/config/release';
import { updateUserProfile } from '@/services/firebase/auth';
import { deletePatient, createPatient } from '@/services/firebase/patients';
import { fetchSheetAsCSV, parseWardData } from '@/services/sheets/googleSheets';
import type { ParsedSheetPatient } from '@/services/sheets/googleSheets';
import type { PatientFormData } from '@/types/patient';
import {
  getNotificationPermission,
  hasRequestedPermission,
  markPermissionRequested,
  requestNotificationPermission,
} from '@/services/browserNotifications';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { setMode } = useModeContext();
  const syncTimerRef = useRef<number | null>(null);

  const {
    defaultMode,
    theme,
    compactView,
    showAISuggestions,
    labTrendDays,
    labPriorityProfile,
    notifyCriticalLabs,
    notifyTaskReminders,
    notifyHandoverAlerts,
    setDefaultMode,
    setTheme,
    setCompactView,
    setShowAISuggestions,
    setLabTrendDays,
    setLabPriorityProfile,
    setNotifyCriticalLabs,
    setNotifyTaskReminders,
    setNotifyHandoverAlerts,
  } = useSettingsStore();

  // ── Patient management ────────────────────────────────────────────────────
  const patients = usePatientStore((s) => s.patients);
  const removePatientFromStore = usePatientStore((s) => s.removePatient);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const allSelected = patients.length > 0 && selectedIds.size === patients.length;
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(patients.map((p) => p.id)));
    }
    setDeleteConfirm(false);
  }

  function togglePatient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDeleteConfirm(false);
  }

  async function handleDeleteSelected() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    setDeleteResult(null);
    let failed = 0;
    for (const id of selectedIds) {
      try {
        await deletePatient(id);
        removePatientFromStore(id);
      } catch {
        failed++;
      }
    }
    const deleted = selectedIds.size - failed;
    setDeleteResult(
      failed === 0
        ? `${deleted} patient${deleted !== 1 ? 's' : ''} deleted.`
        : `${deleted} deleted, ${failed} failed.`
    );
    setSelectedIds(new Set());
    setDeleteConfirm(false);
    setDeleting(false);
  }

  // ── Google Sheets import ──────────────────────────────────────────────────
  const sheetUrl = useSheetIntegrationStore((s) => s.sheetUrl);
  const setSheetUrl = useSheetIntegrationStore((s) => s.setSheetUrl);
  const sheetTabName = useSheetIntegrationStore((s) => s.sheetTabName);
  const setSheetTabName = useSheetIntegrationStore((s) => s.setSheetTabName);
  const sheetId = useSheetIntegrationStore((s) => s.sheetId);
  const columnMappings = useSheetIntegrationStore((s) => s.columnMappings);

  const [previewPatients, setPreviewPatients] = useState<ParsedSheetPatient[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ ok: number; failed: number } | null>(null);

  async function handleFetchPreview() {
    if (!sheetId) {
      setFetchError('Enter a valid Google Sheets URL first.');
      return;
    }
    setFetching(true);
    setFetchError(null);
    setPreviewPatients([]);
    setImportResult(null);
    try {
      const rows = await fetchSheetAsCSV(sheetId, sheetTabName || undefined);
      const parsed = parseWardData(rows, columnMappings, { skipHeaderRows: 1 });
      if (parsed.length === 0) {
        setFetchError('No patients found. Check your sheet URL, tab name, and column mappings.');
      } else {
        setPreviewPatients(parsed);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch sheet.');
    } finally {
      setFetching(false);
    }
  }

  async function handleImport() {
    if (!user || previewPatients.length === 0) return;
    setImporting(true);
    setImportProgress(0);
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < previewPatients.length; i++) {
      const p = previewPatients[i];
      const formData: PatientFormData = {
        mrn: p.mrn,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        wardId: p.wardId || 'default',
        bedNumber: p.bedNumber,
        acuity: p.acuity,
        primaryDiagnosis: p.primaryDiagnosis,
        diagnoses: [],
        allergies: p.allergies,
        codeStatus: p.codeStatus,
        attendingPhysician: p.attendingPhysician,
        team: p.team,
      };
      try {
        await createPatient(formData, user.id);
        ok++;
      } catch {
        failed++;
      }
      setImportProgress(i + 1);
    }
    setImportResult({ ok, failed });
    setPreviewPatients([]);
    setImporting(false);
  }

  // ── Settings sync ─────────────────────────────────────────────────────────
  const queueProfileSync = useCallback(() => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(async () => {
      const latestUser = useAuthStore.getState().user;
      if (!latestUser) return;

      const preferences = useSettingsStore.getState().toUserPreferences();
      try {
        await updateUserProfile(latestUser.id, { preferences });
        useAuthStore.getState().setUser({ ...latestUser, preferences });
      } catch (error) {
        console.error('Failed to sync settings:', error);
      }
    }, 350);
  }, []);

  useEffect(
    () => () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
    },
    [],
  );

  const maybeRequestNotificationPermission = useCallback((nextEnabled: boolean) => {
    if (!nextEnabled) return;
    if (getNotificationPermission() === 'granted') return;
    if (hasRequestedPermission()) return;

    void requestNotificationPermission().finally(() => {
      markPermissionRequested();
    });
  }, []);

  function handleDefaultModeChange(mode: ClinicalMode) {
    setDefaultMode(mode);
    setMode(mode);
    queueProfileSync();
  }

  function handleCompactViewToggle() {
    setCompactView(!compactView);
    queueProfileSync();
  }

  function handleAISuggestionsToggle() {
    setShowAISuggestions(!showAISuggestions);
    queueProfileSync();
  }

  function handleLabTrendDaysChange(days: number) {
    setLabTrendDays(days);
    queueProfileSync();
  }

  function handleLabPriorityProfileChange(profile: LabPriorityProfile) {
    setLabPriorityProfile(profile);
    queueProfileSync();
  }

  function handleNotifyCriticalLabsToggle() {
    const next = !notifyCriticalLabs;
    setNotifyCriticalLabs(next);
    maybeRequestNotificationPermission(next);
    queueProfileSync();
  }

  function handleNotifyTaskRemindersToggle() {
    const next = !notifyTaskReminders;
    setNotifyTaskReminders(next);
    maybeRequestNotificationPermission(next);
    queueProfileSync();
  }

  function handleNotifyHandoverAlertsToggle() {
    const next = !notifyHandoverAlerts;
    setNotifyHandoverAlerts(next);
    maybeRequestNotificationPermission(next);
    queueProfileSync();
  }

  // ── Shared toggle style ───────────────────────────────────────────────────
  const toggleStyle = (checked: boolean) =>
    clsx(
      'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
      checked ? 'bg-blue-600' : 'bg-slate-200',
    );
  const thumbStyle = (checked: boolean): React.CSSProperties => ({
    transform: checked ? 'translateX(20px)' : 'translateX(2px)',
    marginTop: '2px',
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-ward-bg">
      {/* Header */}
      <div className="bg-ward-card border-b border-ward-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-slate-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Profile Section */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">Profile</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Display Name</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">
                {user?.displayName || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Role</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5 capitalize">
                {user?.role || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Department</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">
                {user?.department || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm font-medium text-slate-900 mt-0.5">
                {user?.email || 'Not set'}
              </p>
            </div>
            {user?.teamId && (
              <div>
                <p className="text-xs text-slate-500">Team ID</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {user.teamId}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Preferences Section */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <Monitor size={18} className="text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">Preferences</h2>
          </div>
          <div className="space-y-5">
            {/* Default mode */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Default Clinical Mode
              </label>
              <select
                value={defaultMode}
                onChange={(e) => handleDefaultModeChange(e.target.value as ClinicalMode)}
                className={clsx(
                  'block w-full h-10 px-3 pr-8 rounded-lg text-sm text-slate-900',
                  'bg-ward-card border border-ward-border',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
                  'appearance-none bg-no-repeat bg-[length:16px_16px] bg-[right_0.5rem_center]',
                  'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")]',
                )}
              >
                <option value="ward">Ward Round</option>
                <option value="acute">On-Call</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                The mode that loads when you open the app
              </p>
            </div>

            {/* Theme selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Appearance
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'light' as ThemeSetting, label: 'Light', icon: Sun },
                  { value: 'dark' as ThemeSetting, label: 'Dark', icon: Moon },
                  { value: 'system' as ThemeSetting, label: 'System', icon: Laptop },
                ]).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={clsx(
                      'flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium border transition-colors',
                      theme === value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-ward-card text-slate-600 dark:text-slate-300 border-ward-border hover:border-slate-400 dark:hover:border-slate-500',
                    )}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Choose light, dark, or match your device setting
              </p>
            </div>

            {/* Compact view toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Compact View</p>
                <p className="text-xs text-slate-500">Display patient cards in a condensed format</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={compactView}
                onClick={handleCompactViewToggle}
                className={toggleStyle(compactView)}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={thumbStyle(compactView)}
                />
              </button>
            </div>

            {/* AI suggestions toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">AI Suggestions</p>
                <p className="text-xs text-slate-500">Show AI-powered clinical suggestions</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showAISuggestions}
                onClick={handleAISuggestionsToggle}
                className={toggleStyle(showAISuggestions)}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={thumbStyle(showAISuggestions)}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Notifications Section */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Critical Lab Values</p>
                <p className="text-xs text-slate-500">Alert when critical lab results arrive</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifyCriticalLabs}
                onClick={handleNotifyCriticalLabsToggle}
                className={toggleStyle(notifyCriticalLabs)}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={thumbStyle(notifyCriticalLabs)}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Task Reminders</p>
                <p className="text-xs text-slate-500">Notify about upcoming and overdue tasks</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifyTaskReminders}
                onClick={handleNotifyTaskRemindersToggle}
                className={toggleStyle(notifyTaskReminders)}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={thumbStyle(notifyTaskReminders)}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Handover Alerts</p>
                <p className="text-xs text-slate-500">Notifications for handover-related events</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifyHandoverAlerts}
                onClick={handleNotifyHandoverAlertsToggle}
                className={toggleStyle(notifyHandoverAlerts)}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={thumbStyle(notifyHandoverAlerts)}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Lab Settings Section */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <Beaker size={18} className="text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">Lab Settings</h2>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Lab Trend Days
                </label>
                <span className="text-sm font-semibold text-blue-600">{labTrendDays} days</span>
              </div>
              <input
                type="range"
                min={3}
                max={30}
                value={labTrendDays}
                onChange={(e) => handleLabTrendDaysChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>3 days</span>
                <span>30 days</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Number of days of lab trend data to display in charts
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Lab Priority Profile
              </label>
              <select
                value={labPriorityProfile}
                onChange={(e) => handleLabPriorityProfileChange(e.target.value as LabPriorityProfile)}
                className={clsx(
                  'block w-full h-10 px-3 pr-8 rounded-lg text-sm text-slate-900',
                  'bg-ward-card border border-ward-border',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
                  'appearance-none bg-no-repeat bg-[length:16px_16px] bg-[right_0.5rem_center]',
                  'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")]',
                )}
              >
                <option value="ward">Ward (General Medical)</option>
                <option value="icu">ICU (Intensive Care)</option>
                <option value="cardiac">Cardiac</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Determines which labs are highlighted as priorities
              </p>
            </div>
          </div>
        </Card>

        {/* ── Patient Management ──────────────────────────────────────────── */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">Patient Management</h2>
              {patients.length > 0 && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {patients.length}
                </span>
              )}
            </div>
            {patients.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {patients.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No patients on your list.</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto -mx-1 px-1">
              {patients.map((p) => {
                const checked = selectedIds.has(p.id);
                return (
                  <label
                    key={p.id}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                      checked
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePatient(p.id)}
                      className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">
                        Bed {p.bedNumber}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 truncate max-w-[140px] hidden sm:block">
                      {p.primaryDiagnosis}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {someSelected && (
            <div className="mt-4 pt-4 border-t border-ward-border flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {selectedIds.size} patient{selectedIds.size !== 1 ? 's' : ''} selected
              </p>
              <div className="flex items-center gap-2">
                {deleteConfirm && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1"
                  >
                    Cancel
                  </button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  loading={deleting}
                  iconLeft={deleteConfirm ? <AlertTriangle size={14} /> : <Trash2 size={14} />}
                  onClick={handleDeleteSelected}
                >
                  {deleteConfirm
                    ? `Confirm — delete ${selectedIds.size}`
                    : `Delete ${selectedIds.size} selected`}
                </Button>
              </div>
            </div>
          )}

          {deleteResult && (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <Check size={14} />
              {deleteResult}
            </div>
          )}
        </Card>

        {/* ── Google Sheets Import ────────────────────────────────────────── */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet size={18} className="text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">Import from Google Sheets</h2>
          </div>

          <div className="space-y-4">
            {/* Sheet URL */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Google Sheet URL
              </label>
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => {
                  setSheetUrl(e.target.value);
                  setPreviewPatients([]);
                  setFetchError(null);
                  setImportResult(null);
                }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className={clsx(
                  'block w-full h-10 px-3 rounded-lg text-sm',
                  'text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
                  'bg-ward-card border border-ward-border',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
                )}
              />
              <p className="text-xs text-slate-500 mt-1">
                Sheet must be shared as <strong>"Anyone with the link can view"</strong>
              </p>
            </div>

            {/* Tab name */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Sheet Tab Name
              </label>
              <input
                type="text"
                value={sheetTabName}
                onChange={(e) => {
                  setSheetTabName(e.target.value);
                  setPreviewPatients([]);
                  setFetchError(null);
                }}
                placeholder="Sheet1"
                className={clsx(
                  'block w-full h-10 px-3 rounded-lg text-sm',
                  'text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
                  'bg-ward-card border border-ward-border',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
                )}
              />
            </div>

            {/* Column mappings summary */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-ward-border">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                Column Mappings
              </p>
              <div className="flex flex-wrap gap-2">
                {columnMappings.map((m) => (
                  <span
                    key={m.sheetColumn}
                    className="inline-flex items-center gap-1 text-xs bg-ward-card border border-ward-border rounded px-2 py-1 text-slate-600 dark:text-slate-300"
                  >
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{m.sheetColumn}</span>
                    <span className="text-slate-400">→</span>
                    {m.patientField}
                  </span>
                ))}
              </div>
            </div>

            {/* Fetch button */}
            <Button
              variant="secondary"
              iconLeft={<RefreshCw size={14} />}
              loading={fetching}
              onClick={handleFetchPreview}
              disabled={!sheetId}
            >
              Fetch Preview
            </Button>

            {/* Error */}
            {fetchError && (
              <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2.5 rounded-lg border border-red-200 dark:border-red-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {fetchError}
              </div>
            )}

            {/* Preview list */}
            {previewPatients.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {previewPatients.length} patient{previewPatients.length !== 1 ? 's' : ''} found
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={importing}
                    iconLeft={!importing ? <FileSpreadsheet size={14} /> : undefined}
                    onClick={handleImport}
                  >
                    {importing
                      ? `Importing ${importProgress}/${previewPatients.length}…`
                      : `Import ${previewPatients.length} patients`}
                  </Button>
                </div>

                <div className="rounded-lg border border-ward-border overflow-hidden">
                  <div className="grid grid-cols-4 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-2 border-b border-ward-border">
                    <span>Bed</span>
                    <span>Name</span>
                    <span className="col-span-2">Diagnosis / Doctor</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-ward-border">
                    {previewPatients.map((p, i) => (
                      <div key={i} className="grid grid-cols-4 text-xs px-3 py-2 text-slate-700 dark:text-slate-300">
                        <span className="font-mono font-medium">{p.bedNumber || '—'}</span>
                        <span className="truncate">{p.firstName} {p.lastName}</span>
                        <span className="col-span-2 truncate text-slate-500">
                          {p.primaryDiagnosis || '—'}
                          {p.attendingPhysician ? ` · ${p.attendingPhysician}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div className={clsx(
                'flex items-center gap-2 text-sm px-3 py-2 rounded-lg border',
                importResult.failed === 0
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
              )}>
                <Check size={14} />
                {importResult.ok} patient{importResult.ok !== 1 ? 's' : ''} imported
                {importResult.failed > 0 && `, ${importResult.failed} failed`}.
              </div>
            )}
          </div>
        </Card>

        {/* About Section */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <Info size={18} className="text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">About</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">App Name</span>
              <span className="text-sm font-medium text-slate-900">{APP_NAME}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Version</span>
              <span className="text-sm font-medium text-slate-900">{APP_VERSION}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Release Stage</span>
              <Badge
                variant={RELEASE_STAGE === 'production' ? 'success' : 'info'}
                size="sm"
              >
                {RELEASE_STAGE}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Built with</span>
              <span className="text-sm text-slate-500">React 19, TypeScript, Firebase</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4">
            <a href="/privacy" className="text-sm text-blue-600 hover:underline">
              Privacy Policy
            </a>
            <a href="/terms" className="text-sm text-blue-600 hover:underline">
              Terms of Service
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}

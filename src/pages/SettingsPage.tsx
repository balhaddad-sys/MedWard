import { useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Settings,
  User,
  Bell,
  Beaker,
  Monitor,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useModeContext } from '@/context/useModeContext';
import type { ClinicalMode } from '@/config/modes';
import type { LabPriorityProfile } from '@/stores/settingsStore';
import { APP_NAME, APP_VERSION } from '@/config/constants';
import { RELEASE_STAGE } from '@/config/release';
import { updateUserProfile } from '@/services/firebase/auth';
import {
  getNotificationPermission,
  hasRequestedPermission,
  markPermissionRequested,
  requestNotificationPermission,
} from '@/services/browserNotifications';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { setMode } = useModeContext();
  const syncTimerRef = useRef<number | null>(null);

  const {
    defaultMode,
    compactView,
    showAISuggestions,
    labTrendDays,
    labPriorityProfile,
    notifyCriticalLabs,
    notifyTaskReminders,
    notifyHandoverAlerts,
    setDefaultMode,
    setCompactView,
    setShowAISuggestions,
    setLabTrendDays,
    setLabPriorityProfile,
    setNotifyCriticalLabs,
    setNotifyTaskReminders,
    setNotifyHandoverAlerts,
  } = useSettingsStore();

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

  return (
    <div className="min-h-screen bg-ward-bg">
      {/* Header */}
      <div className="bg-ward-card border-b border-ward-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-slate-400" />
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
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
                <option value="clerking">Clerking</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                The mode that loads when you open the app
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
                className={clsx(
                  'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  compactView ? 'bg-blue-600' : 'bg-slate-200',
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
                    compactView ? 'translate-x-5.5' : 'translate-x-0.5',
                    compactView ? 'ml-[2px] mt-[2px]' : 'ml-[2px] mt-[2px]',
                  )}
                  style={{
                    transform: compactView ? 'translateX(20px)' : 'translateX(2px)',
                    marginTop: '2px',
                  }}
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
                className={clsx(
                  'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  showAISuggestions ? 'bg-blue-600' : 'bg-slate-200',
                )}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{
                    transform: showAISuggestions ? 'translateX(20px)' : 'translateX(2px)',
                    marginTop: '2px',
                  }}
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
            {/* Critical labs */}
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
                className={clsx(
                  'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  notifyCriticalLabs ? 'bg-blue-600' : 'bg-slate-200',
                )}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{
                    transform: notifyCriticalLabs ? 'translateX(20px)' : 'translateX(2px)',
                    marginTop: '2px',
                  }}
                />
              </button>
            </div>

            {/* Task reminders */}
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
                className={clsx(
                  'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  notifyTaskReminders ? 'bg-blue-600' : 'bg-slate-200',
                )}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{
                    transform: notifyTaskReminders ? 'translateX(20px)' : 'translateX(2px)',
                    marginTop: '2px',
                  }}
                />
              </button>
            </div>

            {/* Handover alerts */}
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
                className={clsx(
                  'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  notifyHandoverAlerts ? 'bg-blue-600' : 'bg-slate-200',
                )}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{
                    transform: notifyHandoverAlerts ? 'translateX(20px)' : 'translateX(2px)',
                    marginTop: '2px',
                  }}
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
            {/* Trend days slider */}
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

            {/* Priority profile */}
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
            <a
              href="/privacy"
              className="text-sm text-blue-600 hover:underline"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="text-sm text-blue-600 hover:underline"
            >
              Terms of Service
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}

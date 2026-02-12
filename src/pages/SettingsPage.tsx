import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { APP_NAME, APP_VERSION } from '@/config/constants'

function SettingToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5"
      />
      <div>
        <span className="text-sm font-medium text-ward-text group-hover:text-primary-600 transition-colors">{label}</span>
        <p className="text-xs text-ward-muted mt-0.5">{description}</p>
      </div>
    </label>
  )
}

export function SettingsPage() {
  const settings = useSettingsStore()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-ward-text">Settings</h1>
        <p className="text-sm text-ward-muted mt-1">Customize how {APP_NAME} works for you</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-xs text-ward-muted">Name</dt>
              <dd className="text-sm font-medium">{user?.displayName || 'Not set'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-xs text-ward-muted">Email</dt>
              <dd className="text-sm">{user?.email || 'Not set'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-xs text-ward-muted">Role</dt>
              <dd className="text-sm capitalize">{user?.role || 'Not set'}</dd>
            </div>
          </dl>
          <p className="text-xs text-ward-muted mt-3 pt-3 border-t border-ward-border">
            Profile information is managed by your hospital administrator.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Display</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ward-text mb-1">Default Mode</label>
            <select
              className="input-field"
              value={settings.defaultMode}
              onChange={(e) => settings.setDefaultMode(e.target.value as 'ward' | 'acute' | 'clerking')}
            >
              <option value="ward">Ward Round — Full patient management</option>
              <option value="acute">On-Call — Acute care, calculators, escalation tools</option>
              <option value="clerking">Clerking — Structured patient admission workflow</option>
            </select>
            <p className="text-xs text-ward-muted mt-1">This mode will be selected when you first open the app.</p>
          </div>
          <SettingToggle
            label="Compact view"
            description="Show condensed patient cards to see more patients at once."
            checked={settings.compactView}
            onChange={settings.setCompactView}
          />
          <SettingToggle
            label="Show AI suggestions"
            description="Display AI-powered analysis and suggestions for labs, tasks, and handovers."
            checked={settings.showAISuggestions}
            onChange={settings.setShowAISuggestions}
          />
          <div>
            <label className="block text-sm font-medium text-ward-text mb-1">Lab Trend Days</label>
            <select className="input-field" value={settings.labTrendDays} onChange={(e) => settings.setLabTrendDays(Number(e.target.value))}>
              {[3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
            <p className="text-xs text-ward-muted mt-1">How far back to show lab trends in charts and analysis.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-ward-muted -mt-1">Choose which alerts you want to receive while using the app.</p>
          <SettingToggle
            label="Critical lab value alerts"
            description="Get notified immediately when a patient has a critical lab result."
            checked={settings.notifyCriticalLabs}
            onChange={settings.setNotifyCriticalLabs}
          />
          <SettingToggle
            label="Task reminders"
            description="Receive reminders for pending and overdue tasks."
            checked={settings.notifyTaskReminders}
            onChange={settings.setNotifyTaskReminders}
          />
          <SettingToggle
            label="Handover alerts"
            description="Get notified when a handover report is ready or a shift change is approaching."
            checked={settings.notifyHandoverAlerts}
            onChange={settings.setNotifyHandoverAlerts}
          />
        </CardContent>
      </Card>

      <div className="text-center text-xs text-ward-muted py-4">
        {APP_NAME} v{APP_VERSION}
      </div>
    </div>
  )
}

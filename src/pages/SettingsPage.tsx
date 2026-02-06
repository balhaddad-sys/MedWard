import { Save } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { APP_NAME, APP_VERSION } from '@/config/constants'

export function SettingsPage() {
  const settings = useSettingsStore()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-ward-text">Settings</h1>
        <p className="text-sm text-ward-muted mt-1">Configure your preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div><dt className="text-xs text-ward-muted">Name</dt><dd className="text-sm font-medium">{user?.displayName || 'N/A'}</dd></div>
            <div><dt className="text-xs text-ward-muted">Email</dt><dd className="text-sm">{user?.email || 'N/A'}</dd></div>
            <div><dt className="text-xs text-ward-muted">Role</dt><dd className="text-sm capitalize">{user?.role || 'N/A'}</dd></div>
          </dl>
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
              onChange={(e) => settings.setDefaultMode(e.target.value as 'clinical' | 'triage' | 'handover')}
            >
              <option value="clinical">Clinical</option>
              <option value="triage">Lab Triage</option>
              <option value="handover">Handover</option>
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.compactView} onChange={(e) => settings.setCompactView(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm">Compact view</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.showAISuggestions} onChange={(e) => settings.setShowAISuggestions(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm">Show AI suggestions</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-ward-text mb-1">Lab Trend Days</label>
            <select className="input-field" value={settings.labTrendDays} onChange={(e) => settings.setLabTrendDays(Number(e.target.value))}>
              {[3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.notifyCriticalLabs} onChange={(e) => settings.setNotifyCriticalLabs(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm">Critical lab value alerts</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.notifyTaskReminders} onChange={(e) => settings.setNotifyTaskReminders(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm">Task reminders</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={settings.notifyHandoverAlerts} onChange={(e) => settings.setNotifyHandoverAlerts(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm">Handover alerts</span>
          </label>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-ward-muted py-4">
        {APP_NAME} v{APP_VERSION}
      </div>
    </div>
  )
}

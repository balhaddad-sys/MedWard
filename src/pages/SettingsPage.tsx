import { useCallback, useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { usePatientStore } from '@/stores/patientStore'
import { subscribeToUserPatients, deletePatient } from '@/services/firebase/patients'
import { APP_NAME, APP_VERSION } from '@/config/constants'
import { SheetIntegrationCard } from '@/components/features/sheets/SheetIntegrationCard'
import type { Patient } from '@/types'

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

const STATE_COLORS: Record<string, string> = {
  incoming: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  unstable: 'bg-red-100 text-red-700',
  ready_dc: 'bg-amber-100 text-amber-700',
  discharged: 'bg-gray-100 text-gray-500',
}

const STATE_LABELS: Record<string, string> = {
  incoming: 'Incoming',
  active: 'Active',
  unstable: 'Unstable',
  ready_dc: 'Ready D/C',
  discharged: 'Discharged',
}

const ACUITY_COLORS: Record<number, string> = {
  1: 'bg-red-600 text-white',
  2: 'bg-orange-500 text-white',
  3: 'bg-yellow-400 text-yellow-900',
  4: 'bg-green-500 text-white',
  5: 'bg-blue-400 text-white',
}

const CODE_STATUS_LABELS: Record<string, string> = {
  full: 'Full Code',
  DNR: 'DNR',
  DNI: 'DNI',
  comfort: 'Comfort',
}

function formatDate(ts: unknown): string {
  if (!ts) return '—'
  const date = typeof ts === 'object' && ts !== null && 'toDate' in ts
    ? (ts as { toDate: () => Date }).toDate()
    : new Date(ts as string)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

function PatientManagementCard() {
  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)
  const removePatient = usePatientStore((s) => s.removePatient)

  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState<'selected' | 'all' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ done: 0, total: 0 })
  const [filterState, setFilterState] = useState<string>('all')

  useEffect(() => {
    if (!user?.id) return
    const unsubscribe = subscribeToUserPatients(user.id, (pts) => {
      setPatients(pts.sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)))
      setLoading(false)
      setSelected((prev) => {
        const existingIds = new Set(pts.map((p) => p.id))
        const next = new Set([...prev].filter((id) => existingIds.has(id)))
        return next.size === prev.size ? prev : next
      })
    })
    return unsubscribe
  }, [user?.id])

  const filteredPatients = filterState === 'all'
    ? patients
    : patients.filter((p) => p.state === filterState)

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    const ids = filteredPatients.map((p) => p.id)
    const allFilteredSelected = ids.length > 0 && ids.every((id) => selected.has(id))
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
    }
  }, [filteredPatients, selected])

  const handleDelete = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    setDeleting(true)
    setDeleteProgress({ done: 0, total: ids.length })

    let succeeded = 0
    for (const id of ids) {
      try {
        await deletePatient(id)
        removePatient(id)
        succeeded++
        setDeleteProgress({ done: succeeded, total: ids.length })
      } catch (err) {
        console.error('Failed to delete patient:', id, err)
        addToast({
          type: 'error',
          title: 'Deletion failed',
          message: `Deleted ${succeeded} of ${ids.length}. Check permissions.`,
        })
        break
      }
    }

    if (succeeded === ids.length) {
      addToast({ type: 'success', title: `Deleted ${succeeded} patient${succeeded !== 1 ? 's' : ''}` })
    }

    setSelected(new Set())
    setConfirming(null)
    setDeleting(false)
  }, [addToast, removePatient])

  const confirmIds = confirming === 'all' ? filteredPatients.map((p) => p.id) : [...selected]
  const allFilteredSelected = filteredPatients.length > 0 && filteredPatients.every((p) => selected.has(p.id))

  // Count patients per state for filter badges
  const stateCounts = patients.reduce<Record<string, number>>((acc, p) => {
    acc[p.state] = (acc[p.state] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Patient Management</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 py-4 justify-center">
            <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-ward-muted">Loading patients...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Patient Management</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {patients.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-ward-muted">No patients found.</p>
            <p className="text-xs text-ward-muted mt-1">Patients you add will appear here for management.</p>
          </div>
        ) : (
          <>
            {/* State filter pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              <button
                onClick={() => setFilterState('all')}
                className={clsx(
                  'text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0',
                  filterState === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                All ({patients.length})
              </button>
              {Object.entries(STATE_LABELS).map(([key, label]) =>
                stateCounts[key] ? (
                  <button
                    key={key}
                    onClick={() => setFilterState(key)}
                    className={clsx(
                      'text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0',
                      filterState === key
                        ? STATE_COLORS[key]
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {label} ({stateCounts[key]})
                  </button>
                ) : null
              )}
            </div>

            {/* Action bar — stacks vertically on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  disabled={deleting || filteredPatients.length === 0}
                  className="text-xs font-medium px-3 py-2 min-h-[36px] rounded-lg border border-ward-border hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {allFilteredSelected ? 'Deselect All' : 'Select All'}
                </button>

                <span className="text-xs text-ward-muted">
                  {selected.size} selected
                </span>
              </div>

              <div className="flex items-center gap-2 sm:ml-auto">
                <button
                  onClick={() => setConfirming('selected')}
                  disabled={selected.size === 0 || deleting}
                  className={clsx(
                    'text-xs font-medium px-3 py-2 min-h-[36px] rounded-lg transition-colors flex-1 sm:flex-none',
                    selected.size > 0 && !deleting
                      ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  Delete Selected ({selected.size})
                </button>

                <button
                  onClick={() => { setSelected(new Set(filteredPatients.map((p) => p.id))); setConfirming('all') }}
                  disabled={deleting || filteredPatients.length === 0}
                  className="text-xs font-medium px-3 py-2 min-h-[36px] rounded-lg border border-red-300 text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50 flex-1 sm:flex-none"
                >
                  Delete All
                </button>
              </div>
            </div>

            {/* Confirmation banner */}
            {confirming && !deleting && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-medium">
                  Permanently delete {confirmIds.length} patient{confirmIds.length !== 1 ? 's' : ''}? This cannot be undone.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setConfirming(null)}
                    className="text-xs font-medium px-3 py-2 min-h-[36px] rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(confirmIds)}
                    className="text-xs font-medium px-3 py-2 min-h-[36px] rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}

            {/* Deleting progress */}
            {deleting && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 font-medium">
                  Deleting {deleteProgress.done} of {deleteProgress.total}...
                </p>
                <div className="w-full h-1.5 bg-amber-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${(deleteProgress.done / deleteProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Patient list — responsive cards */}
            <div className="border border-ward-border rounded-lg divide-y divide-ward-border max-h-[420px] overflow-y-auto overscroll-contain">
              {filteredPatients.map((p) => (
                <label
                  key={p.id}
                  className={clsx(
                    'flex gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors',
                    selected.has(p.id) && 'bg-red-50/50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    disabled={deleting}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 flex-shrink-0 mt-1 w-4 h-4"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Row 1: Name + State badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-ward-text leading-tight">
                        {p.lastName}, {p.firstName}
                      </p>
                      <span className={clsx(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                        STATE_COLORS[p.state] || 'bg-gray-100 text-gray-500'
                      )}>
                        {STATE_LABELS[p.state] || p.state}
                      </span>
                    </div>

                    {/* Row 2: Key identifiers */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ward-muted">
                      <span>MRN: {p.mrn || '—'}</span>
                      <span>Bed: {p.wardId}/{p.bedNumber || '—'}</span>
                      {p.acuity && (
                        <span className={clsx(
                          'text-[10px] font-bold px-1.5 py-0 rounded',
                          ACUITY_COLORS[p.acuity] || 'bg-gray-200 text-gray-700'
                        )}>
                          ESI {p.acuity}
                        </span>
                      )}
                    </div>

                    {/* Row 3: Diagnosis */}
                    {p.primaryDiagnosis && (
                      <p className="text-xs text-ward-text truncate">
                        {p.primaryDiagnosis}
                      </p>
                    )}

                    {/* Row 4: Additional details */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ward-muted">
                      {p.attendingPhysician && <span>Dr. {p.attendingPhysician}</span>}
                      {p.admissionDate && <span>Adm: {formatDate(p.admissionDate)}</span>}
                      {p.codeStatus && p.codeStatus !== 'full' && (
                        <span className="text-red-600 font-medium">{CODE_STATUS_LABELS[p.codeStatus] || p.codeStatus}</span>
                      )}
                      {p.allergies && p.allergies.length > 0 && (
                        <span className="text-orange-600 font-medium">Allergies: {p.allergies.length}</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
              {filteredPatients.length === 0 && (
                <div className="py-4 text-center">
                  <p className="text-xs text-ward-muted">No patients match this filter.</p>
                </div>
              )}
            </div>

            <p className="text-xs text-ward-muted">
              {patients.length} patient{patients.length !== 1 ? 's' : ''} total
              {filterState !== 'all' ? `, ${filteredPatients.length} shown` : ''}.
              Deleted patients cannot be recovered.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function SettingsPage() {
  const settings = useSettingsStore()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-2xl mx-auto">
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

      <SheetIntegrationCard />

      <PatientManagementCard />

      <div className="text-center text-xs text-ward-muted py-4">
        {APP_NAME} v{APP_VERSION}
      </div>
    </div>
  )
}

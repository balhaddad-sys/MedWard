import { AlertTriangle, Plus, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatTimestamp } from '@/utils/formatters'
import type { Patient } from '@/types'

interface OverviewTabProps {
  patient: Patient
  setActiveTab: (tab: string) => void
  setShowLabEntry: (show: boolean) => void
  setShowTaskForm: (show: boolean) => void
  handleGenerateSBAR: () => void
}

export function OverviewTab({ patient, setActiveTab, setShowLabEntry, setShowTaskForm, handleGenerateSBAR }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Care Snapshot</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white border border-blue-100 text-blue-700">
            Team: {patient.team || 'Unassigned'}
          </span>
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white border border-blue-100 text-blue-700">
            Attending: {patient.attendingPhysician || 'Not set'}
          </span>
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white border border-blue-100 text-blue-700">
            Code: {patient.codeStatus || 'Unknown'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent>
            <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-2">Clinical</h3>
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt className="text-xs text-ward-muted">Diagnosis</dt><dd className="text-sm font-medium text-right">{patient.primaryDiagnosis}</dd></div>
              <div className="flex justify-between"><dt className="text-xs text-ward-muted">Other</dt><dd className="text-sm text-right truncate max-w-[60%]">{(patient.diagnoses || []).join(', ') || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-xs text-ward-muted">Attending</dt><dd className="text-sm text-right">{patient.attendingPhysician}</dd></div>
              <div className="flex justify-between"><dt className="text-xs text-ward-muted">Code Status</dt><dd className="text-sm font-medium text-right">{patient.codeStatus}</dd></div>
              <div className="flex justify-between"><dt className="text-xs text-ward-muted">Admitted</dt><dd className="text-sm text-right">{formatTimestamp(patient.admissionDate)}</dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-2">Safety</h3>
            <dl className="space-y-1.5">
              <div>
                <dt className="text-xs text-ward-muted">Allergies</dt>
                <dd className="flex flex-wrap gap-1 mt-1">
                  {(patient.allergies || []).length > 0
                    ? (patient.allergies || []).map((a) => <Badge key={a} variant="danger" size="sm">{a}</Badge>)
                    : <span className="text-xs text-green-600 font-medium">NKDA</span>}
                </dd>
              </div>
              {(patient.isolationPrecautions || []).length > 0 && (
                <div>
                  <dt className="text-xs text-ward-muted">Isolation</dt>
                  <dd className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">{(patient.isolationPrecautions || []).join(', ')}</span>
                  </dd>
                </div>
              )}
              {patient.weight && <div className="flex justify-between"><dt className="text-xs text-ward-muted">Weight</dt><dd className="text-sm text-right">{patient.weight} kg</dd></div>}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setActiveTab('labs'); setShowLabEntry(true) }} className="min-h-[44px]">Add Labs</Button>
        <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { setActiveTab('tasks'); setShowTaskForm(true) }} className="min-h-[44px]">Add Task</Button>
        <Button size="sm" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => { setActiveTab('sbar'); handleGenerateSBAR() }} className="min-h-[44px]">Generate SBAR</Button>
      </div>
    </div>
  )
}

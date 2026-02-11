import { useState, useEffect } from 'react'
import { Save, Plus, X, FileText, Heart, Scissors, Pill, Users, Home, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import { getPatientHistory, savePatientHistory } from '@/services/firebase/history'
import { EMPTY_HISTORY } from '@/types/history'
import type { PatientHistory, PMHEntry, PSHEntry, MedicationEntry, FamilyHistoryEntry, SocialHistory } from '@/types/history'

interface HistoryTabProps {
  patientId: string
  addToast: (toast: { type: 'success' | 'error'; title: string }) => void
}

export function HistoryTab({ patientId, addToast }: HistoryTabProps) {
  const [history, setHistory] = useState<Omit<PatientHistory, 'patientId' | 'updatedAt' | 'updatedBy'>>({ ...EMPTY_HISTORY })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getPatientHistory(patientId)
        if (data) {
          const { patientId: _pid, updatedAt: _ua, updatedBy: _ub, ...rest } = data
          setHistory({ ...EMPTY_HISTORY, ...rest })
        }
      } catch {
        // No history yet — start with empty
      }
      setLoading(false)
    }
    load()
  }, [patientId])

  const handleSave = async () => {
    if (!firebaseUser) return
    setSaving(true)
    try {
      await savePatientHistory(patientId, history, firebaseUser.uid)
      setDirty(false)
      addToast({ type: 'success', title: 'Patient history saved' })
    } catch {
      addToast({ type: 'error', title: 'Failed to save history' })
    }
    setSaving(false)
  }

  const update = <K extends keyof typeof history>(key: K, value: (typeof history)[K]) => {
    setHistory((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  // --- PMH helpers ---
  const addPMH = () => update('pmh', [...history.pmh, { condition: '', status: 'active' }])
  const updatePMH = (i: number, patch: Partial<PMHEntry>) => {
    const next = [...history.pmh]
    next[i] = { ...next[i], ...patch }
    update('pmh', next)
  }
  const removePMH = (i: number) => update('pmh', history.pmh.filter((_, idx) => idx !== i))

  // --- PSH helpers ---
  const addPSH = () => update('psh', [...history.psh, { procedure: '' }])
  const updatePSH = (i: number, patch: Partial<PSHEntry>) => {
    const next = [...history.psh]
    next[i] = { ...next[i], ...patch }
    update('psh', next)
  }
  const removePSH = (i: number) => update('psh', history.psh.filter((_, idx) => idx !== i))

  // --- Medications helpers ---
  const addMed = () => update('medications', [...history.medications, { name: '', status: 'active' }])
  const updateMed = (i: number, patch: Partial<MedicationEntry>) => {
    const next = [...history.medications]
    next[i] = { ...next[i], ...patch }
    update('medications', next)
  }
  const removeMed = (i: number) => update('medications', history.medications.filter((_, idx) => idx !== i))

  // --- Family History helpers ---
  const addFH = () => update('familyHistory', [...history.familyHistory, { relation: '', condition: '' }])
  const updateFH = (i: number, patch: Partial<FamilyHistoryEntry>) => {
    const next = [...history.familyHistory]
    next[i] = { ...next[i], ...patch }
    update('familyHistory', next)
  }
  const removeFH = (i: number) => update('familyHistory', history.familyHistory.filter((_, idx) => idx !== i))

  // --- Social History helpers ---
  const updateSH = (patch: Partial<SocialHistory>) => {
    update('socialHistory', { ...history.socialHistory, ...patch })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        <p className="text-sm text-ward-muted">Loading patient history...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Save button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ward-muted">
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </p>
        <Button
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={!dirty}
          icon={<Save className="h-3.5 w-3.5" />}
          className="min-h-[44px]"
        >
          Save History
        </Button>
      </div>

      {/* HPI */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-primary-600" />
            <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider">History of Present Illness (HPI)</h3>
          </div>
          <textarea
            value={history.hpiText}
            onChange={(e) => update('hpiText', e.target.value)}
            placeholder="Describe the history of present illness, chief complaint, onset, duration, severity, associated symptoms, and relevant context..."
            rows={4}
            className="input-field w-full resize-y min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* PMH */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider">Past Medical History (PMH)</h3>
            </div>
            <button onClick={addPMH} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium min-h-[44px] px-2">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {history.pmh.length === 0 && (
            <p className="text-xs text-ward-muted italic py-2">No conditions recorded. Click "Add" to start.</p>
          )}
          <div className="space-y-2">
            {history.pmh.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={entry.condition}
                  onChange={(e) => updatePMH(i, { condition: e.target.value })}
                  placeholder="Condition (e.g., HTN, DM2, CKD Stage 3)"
                  className="input-field flex-1 text-sm"
                />
                <select
                  value={entry.status || 'active'}
                  onChange={(e) => updatePMH(i, { status: e.target.value as PMHEntry['status'] })}
                  className="input-field w-28 text-xs"
                >
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="controlled">Controlled</option>
                </select>
                <input
                  type="text"
                  value={entry.diagnosedYear || ''}
                  onChange={(e) => updatePMH(i, { diagnosedYear: e.target.value })}
                  placeholder="Year"
                  className="input-field w-16 text-xs"
                />
                <button onClick={() => removePMH(i)} className="p-1.5 text-red-400 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PSH */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-orange-500" />
              <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider">Past Surgical History (PSH)</h3>
            </div>
            <button onClick={addPSH} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium min-h-[44px] px-2">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {history.psh.length === 0 && (
            <p className="text-xs text-ward-muted italic py-2">No surgeries recorded.</p>
          )}
          <div className="space-y-2">
            {history.psh.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={entry.procedure}
                  onChange={(e) => updatePSH(i, { procedure: e.target.value })}
                  placeholder="Procedure (e.g., Appendectomy, CABG x3)"
                  className="input-field flex-1 text-sm"
                />
                <input
                  type="text"
                  value={entry.year || ''}
                  onChange={(e) => updatePSH(i, { year: e.target.value })}
                  placeholder="Year"
                  className="input-field w-16 text-xs"
                />
                <button onClick={() => removePSH(i)} className="p-1.5 text-red-400 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider">Medications</h3>
            </div>
            <button onClick={addMed} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium min-h-[44px] px-2">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {history.medications.length === 0 && (
            <p className="text-xs text-ward-muted italic py-2">No medications recorded.</p>
          )}
          <div className="space-y-2">
            {history.medications.map((entry, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={entry.name}
                  onChange={(e) => updateMed(i, { name: e.target.value })}
                  placeholder="Drug name"
                  className="input-field flex-1 min-w-[120px] text-sm"
                />
                <input
                  type="text"
                  value={entry.dose || ''}
                  onChange={(e) => updateMed(i, { dose: e.target.value })}
                  placeholder="Dose"
                  className="input-field w-20 text-xs"
                />
                <select
                  value={entry.route || ''}
                  onChange={(e) => updateMed(i, { route: e.target.value })}
                  className="input-field w-16 text-xs"
                >
                  <option value="">Route</option>
                  <option value="PO">PO</option>
                  <option value="IV">IV</option>
                  <option value="IM">IM</option>
                  <option value="SC">SC</option>
                  <option value="SL">SL</option>
                  <option value="PR">PR</option>
                  <option value="INH">INH</option>
                  <option value="TOP">TOP</option>
                  <option value="TD">TD</option>
                </select>
                <input
                  type="text"
                  value={entry.frequency || ''}
                  onChange={(e) => updateMed(i, { frequency: e.target.value })}
                  placeholder="Freq"
                  className="input-field w-20 text-xs"
                />
                <select
                  value={entry.status}
                  onChange={(e) => updateMed(i, { status: e.target.value as MedicationEntry['status'] })}
                  className="input-field w-28 text-xs"
                >
                  <option value="active">Active</option>
                  <option value="discontinued">D/C</option>
                  <option value="prn">PRN</option>
                </select>
                <button onClick={() => removeMed(i)} className="p-1.5 text-red-400 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social History */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-4 w-4 text-green-500" />
            <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider">Social History</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ward-muted mb-1 block">Smoking</label>
              <select
                value={history.socialHistory.smoking}
                onChange={(e) => updateSH({ smoking: e.target.value })}
                className="input-field w-full text-sm"
              >
                <option value="">Select...</option>
                <option value="Never">Never</option>
                <option value="Former">Former smoker</option>
                <option value="Current - light">Current - light (&lt;10/day)</option>
                <option value="Current - moderate">Current - moderate (10-20/day)</option>
                <option value="Current - heavy">Current - heavy (&gt;20/day)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-ward-muted mb-1 block">Alcohol</label>
              <select
                value={history.socialHistory.alcohol}
                onChange={(e) => updateSH({ alcohol: e.target.value })}
                className="input-field w-full text-sm"
              >
                <option value="">Select...</option>
                <option value="None">None</option>
                <option value="Social">Social / occasional</option>
                <option value="Moderate">Moderate (1-2 drinks/day)</option>
                <option value="Heavy">Heavy (&gt;3 drinks/day)</option>
                <option value="Former">Former (in recovery)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-ward-muted mb-1 block">Occupation</label>
              <input
                type="text"
                value={history.socialHistory.occupation}
                onChange={(e) => updateSH({ occupation: e.target.value })}
                placeholder="e.g., Teacher, Retired, Construction worker"
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-ward-muted mb-1 block">Living Situation</label>
              <input
                type="text"
                value={history.socialHistory.livingSituation}
                onChange={(e) => updateSH({ livingSituation: e.target.value })}
                placeholder="e.g., Lives alone, with spouse, nursing home"
                className="input-field w-full text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Family History */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <h3 className="text-xs font-semibold text-ward-muted uppercase tracking-wider">Family History</h3>
            </div>
            <button onClick={addFH} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium min-h-[44px] px-2">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {history.familyHistory.length === 0 && (
            <p className="text-xs text-ward-muted italic py-2">No family history recorded.</p>
          )}
          <div className="space-y-2">
            {history.familyHistory.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={entry.relation}
                  onChange={(e) => updateFH(i, { relation: e.target.value })}
                  className="input-field w-28 text-sm"
                >
                  <option value="">Relation</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Paternal GF">Paternal GF</option>
                  <option value="Paternal GM">Paternal GM</option>
                  <option value="Maternal GF">Maternal GF</option>
                  <option value="Maternal GM">Maternal GM</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                </select>
                <input
                  type="text"
                  value={entry.condition}
                  onChange={(e) => updateFH(i, { condition: e.target.value })}
                  placeholder="Condition (e.g., DM2, CAD, Colon cancer)"
                  className="input-field flex-1 text-sm"
                />
                <button onClick={() => removeFH(i)} className="p-1.5 text-red-400 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary badge */}
      <div className="flex flex-wrap gap-1.5">
        {history.pmh.length > 0 && <Badge variant="info" size="sm">{history.pmh.length} PMH</Badge>}
        {history.psh.length > 0 && <Badge variant="info" size="sm">{history.psh.length} PSH</Badge>}
        {history.medications.length > 0 && <Badge variant="info" size="sm">{history.medications.filter((m) => m.status === 'active').length} Active Meds</Badge>}
        {history.familyHistory.length > 0 && <Badge variant="info" size="sm">{history.familyHistory.length} FHx</Badge>}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Plus, Trash2, FlaskConical, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LAB_REFERENCES, flagLabValue } from '@/utils/labUtils'
import { addLabPanel } from '@/services/firebase/labs'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { serverTimestamp } from 'firebase/firestore'
import type { LabValue, LabCategory } from '@/types'

interface LabEntryFormProps {
  patientId: string
  onComplete?: () => void
  onCancel?: () => void
}

const PANEL_PRESETS: { id: string; name: string; category: LabCategory; tests: string[] }[] = [
  { id: 'cbc', name: 'CBC', category: 'CBC', tests: ['WBC', 'RBC', 'HGB', 'HCT', 'PLT'] },
  { id: 'bmp', name: 'BMP', category: 'BMP', tests: ['NA', 'K', 'CL', 'CO2', 'BUN', 'CR', 'GLU'] },
  { id: 'cmp', name: 'CMP', category: 'CMP', tests: ['NA', 'K', 'CL', 'CO2', 'BUN', 'CR', 'GLU', 'CA', 'TP', 'ALB', 'AST', 'ALT', 'ALP', 'TBILI'] },
  { id: 'lft', name: 'LFT', category: 'LFT', tests: ['AST', 'ALT', 'ALP', 'TBILI', 'TP', 'ALB'] },
  { id: 'coag', name: 'Coagulation', category: 'COAG', tests: ['INR', 'PTT'] },
  { id: 'cardiac', name: 'Cardiac', category: 'CARDIAC', tests: ['TROP', 'BNP'] },
  { id: 'thyroid', name: 'Thyroid', category: 'THYROID', tests: ['TSH'] },
  { id: 'misc', name: 'Other / Custom', category: 'MISC', tests: [] },
]

interface LabEntry {
  code: string
  name: string
  value: string
  unit: string
  referenceMin: number
  referenceMax: number
  criticalMin?: number
  criticalMax?: number
}

export function LabEntryForm({ patientId, onComplete, onCancel }: LabEntryFormProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [panelName, setPanelName] = useState('')
  const [entries, setEntries] = useState<LabEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [customCode, setCustomCode] = useState('')
  const [customName, setCustomName] = useState('')
  const [customUnit, setCustomUnit] = useState('')
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const addToast = useUIStore((s) => s.addToast)

  const selectPreset = (presetId: string) => {
    const preset = PANEL_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setSelectedPreset(presetId)
    setPanelName(preset.name)
    if (preset.tests.length > 0) {
      setEntries(
        preset.tests.map((code) => {
          const ref = LAB_REFERENCES[code]
          return {
            code,
            name: ref?.name ?? code,
            value: '',
            unit: ref?.unit ?? '',
            referenceMin: ref?.referenceMin ?? 0,
            referenceMax: ref?.referenceMax ?? 999,
            criticalMin: ref?.criticalMin,
            criticalMax: ref?.criticalMax,
          }
        })
      )
    } else {
      setEntries([])
    }
  }

  const addCustomEntry = () => {
    if (!customName.trim()) return
    const ref = LAB_REFERENCES[customCode.toUpperCase()]
    setEntries((prev) => [
      ...prev,
      {
        code: customCode.toUpperCase() || customName.toUpperCase().replace(/\s/g, ''),
        name: customName.trim(),
        value: '',
        unit: ref?.unit ?? customUnit.trim(),
        referenceMin: ref?.referenceMin ?? 0,
        referenceMax: ref?.referenceMax ?? 999,
        criticalMin: ref?.criticalMin,
        criticalMax: ref?.criticalMax,
      },
    ])
    setCustomCode('')
    setCustomName('')
    setCustomUnit('')
  }

  const updateValue = (index: number, value: string) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, value } : e)))
  }

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const getFlag = (entry: LabEntry) => {
    const num = parseFloat(entry.value)
    if (isNaN(num) || !entry.value.trim()) return null
    return flagLabValue(num, {
      name: entry.name,
      unit: entry.unit,
      referenceMin: entry.referenceMin,
      referenceMax: entry.referenceMax,
      criticalMin: entry.criticalMin,
      criticalMax: entry.criticalMax,
      category: 'MISC',
    })
  }

  const handleSave = async () => {
    if (!patientId || !firebaseUser) {
      addToast({ type: 'error', title: 'Missing patient or login' })
      return
    }
    const filledEntries = entries.filter((e) => e.value.trim() !== '')
    if (filledEntries.length === 0) {
      addToast({ type: 'error', title: 'Enter at least one lab value' })
      return
    }

    setSaving(true)
    try {
      const preset = PANEL_PRESETS.find((p) => p.id === selectedPreset)
      const category = preset?.category ?? 'MISC'

      const values: LabValue[] = filledEntries.map((entry) => {
        const num = parseFloat(entry.value)
        const isNumeric = !isNaN(num)
        const flag = isNumeric
          ? flagLabValue(num, {
              name: entry.name,
              unit: entry.unit,
              referenceMin: entry.referenceMin,
              referenceMax: entry.referenceMax,
              criticalMin: entry.criticalMin,
              criticalMax: entry.criticalMax,
              category: 'MISC',
            })
          : 'normal'

        return {
          name: entry.name,
          value: isNumeric ? num : entry.value,
          unit: entry.unit,
          referenceMin: entry.referenceMin,
          referenceMax: entry.referenceMax,
          criticalMin: entry.criticalMin,
          criticalMax: entry.criticalMax,
          flag,
        }
      })

      await addLabPanel(patientId, {
        patientId,
        category,
        panelName: panelName || 'Lab Panel',
        values,
        collectedAt: serverTimestamp(),
        resultedAt: serverTimestamp(),
        orderedBy: firebaseUser.displayName ?? firebaseUser.email ?? 'Unknown',
        status: 'resulted',
        source: 'manual',
      } as never)

      addToast({ type: 'success', title: 'Lab results saved', message: `${values.length} values added to patient` })
      onComplete?.()
    } catch (err) {
      console.error('Failed to save labs:', err)
      addToast({ type: 'error', title: 'Failed to save lab results' })
    } finally {
      setSaving(false)
    }
  }

  // Step 1: Select panel type
  if (!selectedPreset) {
    return (
      <Card className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-ward-text mb-4 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary-600" />
          Select Lab Panel Type
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PANEL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => selectPreset(preset.id)}
              className="p-3 rounded-xl border border-ward-border hover:border-primary-300 hover:bg-primary-50 transition-colors text-center min-h-[56px]"
            >
              <p className="text-sm font-medium text-ward-text">{preset.name}</p>
              <p className="text-xs text-ward-muted mt-0.5">
                {preset.tests.length > 0 ? `${preset.tests.length} tests` : 'Custom'}
              </p>
            </button>
          ))}
        </div>
        {onCancel && (
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" size="sm" onClick={onCancel} className="min-h-[44px]">Cancel</Button>
          </div>
        )}
      </Card>
    )
  }

  // Step 2: Enter values
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ward-text flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary-600" />
            {panelName || 'Lab Panel'}
          </h3>
          <p className="text-xs text-ward-muted mt-0.5">Enter numeric values for each test</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setSelectedPreset(null); setEntries([]) }}
          className="min-h-[44px]"
        >
          Change Panel
        </Button>
      </div>

      {/* Lab value entries */}
      <div className="space-y-2">
        {entries.map((entry, index) => {
          const flag = getFlag(entry)
          return (
            <div key={`${entry.code}-${index}`} className="flex items-center gap-2">
              <span className="text-xs font-medium text-ward-muted w-28 sm:w-36 flex-shrink-0 truncate" title={entry.name}>
                {entry.name}
              </span>
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`input-field text-sm font-mono pr-16 ${
                    flag === 'critical_low' || flag === 'critical_high'
                      ? 'border-red-400 bg-red-50'
                      : flag === 'low' || flag === 'high'
                      ? 'border-orange-300 bg-orange-50'
                      : ''
                  }`}
                  placeholder={`${entry.referenceMin}–${entry.referenceMax}`}
                  value={entry.value}
                  onChange={(e) => updateValue(index, e.target.value)}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ward-muted">
                  {entry.unit}
                </span>
              </div>
              {flag && flag !== 'normal' && (
                <Badge
                  variant={flag.startsWith('critical') ? 'danger' : 'warning'}
                  size="sm"
                  className="flex-shrink-0"
                >
                  {flag === 'critical_high' ? 'CRIT ↑' : flag === 'critical_low' ? 'CRIT ↓' : flag === 'high' ? '↑' : '↓'}
                </Badge>
              )}
              <button
                onClick={() => removeEntry(index)}
                className="p-1 text-ward-muted hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Add custom test */}
      <div className="mt-3 pt-3 border-t border-ward-border">
        <p className="text-xs text-ward-muted mb-2">Add additional test</p>
        <div className="flex items-center gap-2">
          <input
            className="input-field text-sm flex-1"
            placeholder="Test name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomEntry() } }}
          />
          <input
            className="input-field text-sm w-20"
            placeholder="Unit"
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomEntry() } }}
          />
          <Button variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addCustomEntry} className="min-h-[44px] flex-shrink-0">
            Add
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4 pt-4 border-t border-ward-border">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} className="min-h-[44px]">Cancel</Button>
        )}
        <Button
          onClick={handleSave}
          loading={saving}
          icon={<Save className="h-4 w-4" />}
          disabled={entries.filter((e) => e.value.trim()).length === 0}
          className="min-h-[44px]"
        >
          Save Lab Results ({entries.filter((e) => e.value.trim()).length} values)
        </Button>
      </div>
    </Card>
  )
}

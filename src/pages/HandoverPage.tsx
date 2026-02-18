import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Download, Sparkles, Users, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { usePatientStore } from '@/stores/patientStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { generateHandoverSummary } from '@/services/ai/claude'
import { exportHandoverReport } from '@/services/export/pdfExport'
import { Markdown } from '@/components/ui/Markdown'
import { ACUITY_LEVELS } from '@/config/constants'
import { clsx } from 'clsx'

export function HandoverPage() {
  const patients = usePatientStore((s) => s.patients)
  const defaultWard = useSettingsStore((s) => s.defaultWard)

  const [summary, setSummary] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [selectedWard, setSelectedWard] = useState('')
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set())

  const wardOptions = useMemo(() => {
    const set = new Set<string>()
    if (defaultWard) set.add(defaultWard)
    for (const p of patients) { if (p.wardId) set.add(p.wardId) }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [patients, defaultWard])

  useEffect(() => {
    if (selectedWard) return
    if (defaultWard) { setSelectedWard(defaultWard); return }
    if (wardOptions.length === 1) setSelectedWard(wardOptions[0])
  }, [selectedWard, defaultWard, wardOptions])

  const wardPatients = useMemo(
    () => !selectedWard ? patients : patients.filter((p) => p.wardId === selectedWard),
    [patients, selectedWard]
  )

  useEffect(() => {
    setSummary(null)
    setSelectedPatientIds(new Set(wardPatients.map((p) => p.id)))
  }, [selectedWard, wardPatients])

  const allSelected = wardPatients.length > 0 && selectedPatientIds.size === wardPatients.length
  const noneSelected = selectedPatientIds.size === 0

  const togglePatient = (id: string) => {
    setSelectedPatientIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) setSelectedPatientIds(new Set())
    else setSelectedPatientIds(new Set(wardPatients.map((p) => p.id)))
  }

  const selectedPatients = useMemo(
    () => wardPatients.filter((p) => selectedPatientIds.has(p.id)),
    [wardPatients, selectedPatientIds]
  )

  const handleGenerate = async () => {
    const wardId = selectedWard || defaultWard || wardOptions[0]
    if (!wardId) { setSummary('Select a ward first to generate handover.'); return }
    if (noneSelected) { setSummary('Select at least one patient.'); return }
    setGenerating(true)
    try {
      const patientIds = selectedPatientIds.size < wardPatients.length
        ? Array.from(selectedPatientIds) : undefined
      const result = await generateHandoverSummary(wardId, patientIds)
      setSummary(result)
    } catch {
      setSummary('Failed to generate handover summary. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = () => {
    if (!summary) return
    const wardLabel = selectedWard || defaultWard || 'Ward'
    exportHandoverReport(wardLabel, summary, selectedPatients.map((p) => ({
      name: `${p.firstName} ${p.lastName}`, bed: p.bedNumber, summary: p.primaryDiagnosis,
    })))
  }

  const sortedWardPatients = [...wardPatients].sort((a, b) => a.acuity - b.acuity)

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Handover
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Generate AI-powered shift handover reports
          </p>
        </div>
      </div>

      {/* Ward selector + actions */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-shrink-0">Ward</label>
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="input-field flex-1"
          >
            <option value="">All wards</option>
            {wardOptions.map((ward) => (
              <option key={ward} value={ward}>{ward}</option>
            ))}
          </select>
        </div>

        {/* Selection summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            <span className="font-bold text-gray-900">{selectedPatientIds.size}</span>
            {' '}of{' '}
            <span className="font-bold text-gray-900">{wardPatients.length}</span>
            {' '}patients selected
          </span>
          {wardPatients.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            disabled={!summary}
            className="flex-1"
          >
            Export PDF
          </Button>
          <Button
            size="sm"
            icon={<Sparkles className="h-4 w-4" />}
            onClick={handleGenerate}
            loading={generating}
            disabled={wardOptions.length === 0 || noneSelected}
            className="flex-1"
          >
            {generating ? 'Generating…' : `Generate${selectedPatientIds.size > 0 && selectedPatientIds.size < wardPatients.length ? ` (${selectedPatientIds.size})` : ''}`}
          </Button>
        </div>
      </div>

      {/* Patient list */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-800">
            Patient List{selectedWard ? ` — ${selectedWard}` : ''}
          </span>
          <span className="badge badge-info ml-auto">{wardPatients.length}</span>
        </div>

        {wardPatients.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No patients on selected ward</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedWardPatients.map((patient) => {
              const isSelected = selectedPatientIds.has(patient.id)
              const acuityLevel = ACUITY_LEVELS[(patient.acuity >= 1 && patient.acuity <= 5 ? patient.acuity : 3) as keyof typeof ACUITY_LEVELS]
              const isHighAcuity = patient.acuity <= 2

              return (
                <button
                  key={patient.id}
                  onClick={() => togglePatient(patient.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors touch',
                    isSelected && isHighAcuity && 'bg-red-50/30'
                  )}
                >
                  {/* Checkbox */}
                  <div className={clsx(
                    'h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors',
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 bg-white'
                  )}>
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* Acuity dot */}
                  <div className={clsx(
                    'h-2.5 w-2.5 rounded-full flex-shrink-0',
                    patient.acuity <= 2 ? 'bg-red-500' : patient.acuity === 3 ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />

                  {/* Bed */}
                  <span className="text-xs font-mono font-bold text-gray-600 w-8 flex-shrink-0">
                    {patient.bedNumber || '?'}
                  </span>

                  {/* Name + dx */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={clsx('text-sm font-semibold truncate', isSelected ? 'text-gray-900' : 'text-gray-600')}>
                        {patient.lastName}, {patient.firstName}
                      </p>
                      {isHighAcuity && (
                        <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    {patient.primaryDiagnosis && (
                      <p className="text-xs text-gray-400 truncate">{patient.primaryDiagnosis}</p>
                    )}
                  </div>

                  {/* Acuity badge */}
                  <Badge
                    variant={patient.acuity <= 2 ? 'danger' : patient.acuity === 3 ? 'warning' : 'success'}
                    size="sm"
                  >
                    {acuityLevel.label}
                  </Badge>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Summary */}
      {summary && (
        <div className="card overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-900">AI-Generated Handover Summary</span>
          </div>
          <div className="p-4">
            <div className="prose prose-sm max-w-none">
              <Markdown content={summary} className="text-gray-800" />
            </div>
            <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100 italic flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              AI-generated — verify all clinical information with primary sources before handover
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

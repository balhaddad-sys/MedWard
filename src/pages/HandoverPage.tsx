import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Download, Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { usePatientStore } from '@/stores/patientStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { generateHandoverSummary } from '@/services/ai/claude'
import { exportHandoverReport } from '@/services/export/pdfExport'
import { Markdown } from '@/components/ui/Markdown'
import { ACUITY_LEVELS } from '@/config/constants'

export function HandoverPage() {
  const patients = usePatientStore((s) => s.patients)
  const defaultWard = useSettingsStore((s) => s.defaultWard)

  const [summary, setSummary] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [selectedWard, setSelectedWard] = useState('')

  const wardOptions = useMemo(() => {
    const set = new Set<string>()
    if (defaultWard) set.add(defaultWard)
    for (const p of patients) {
      if (p.wardId) set.add(p.wardId)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [patients, defaultWard])

  useEffect(() => {
    if (selectedWard) return
    if (defaultWard) {
      setSelectedWard(defaultWard)
      return
    }
    if (wardOptions.length === 1) {
      setSelectedWard(wardOptions[0])
    }
  }, [selectedWard, defaultWard, wardOptions])

  useEffect(() => {
    setSummary(null)
  }, [selectedWard])

  const wardPatients = useMemo(() => {
    if (!selectedWard) return patients
    return patients.filter((p) => p.wardId === selectedWard)
  }, [patients, selectedWard])

  const handleGenerate = async () => {
    const wardId = selectedWard || defaultWard || wardOptions[0]
    if (!wardId) {
      setSummary('Select a ward first to generate handover.')
      return
    }

    setGenerating(true)
    try {
      const result = await generateHandoverSummary(wardId)
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
    exportHandoverReport(
      wardLabel,
      summary,
      wardPatients.map((p) => ({
        name: `${p.firstName} ${p.lastName}`,
        bed: p.bedNumber,
        summary: p.primaryDiagnosis,
      }))
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ward-text flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 sm:h-6 sm:w-6" /> Handover
          </h1>
          <p className="text-sm text-ward-muted mt-1">Generate shift handover reports</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="input-field text-sm min-h-[44px]"
          >
            <option value="">Select ward</option>
            {wardOptions.map((ward) => (
              <option key={ward} value={ward}>
                {ward}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={handleExport}
              disabled={!summary}
              className="min-h-[44px] flex-1 sm:flex-none"
            >
              Export PDF
            </Button>
            <Button
              size="sm"
              icon={<Sparkles className="h-4 w-4" />}
              onClick={handleGenerate}
              loading={generating}
              disabled={wardOptions.length === 0}
              className="min-h-[44px] flex-1 sm:flex-none"
            >
              Generate
            </Button>
          </div>
        </div>
      </div>

      {summary && (
        <Card>
          <CardHeader><CardTitle>AI-Generated Handover Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <Markdown content={summary} className="text-ward-text" />
            </div>
            <p className="text-xs text-ward-muted mt-4 italic">
              AI-generated content - verify all information with primary sources.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Patient List ({wardPatients.length}){selectedWard ? ` - ${selectedWard}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wardPatients.length === 0 ? (
            <p className="text-ward-muted text-sm py-4 text-center">No patients on the selected ward</p>
          ) : (
            <div className="divide-y divide-ward-border">
              {wardPatients
                .sort((a, b) => a.acuity - b.acuity)
                .map((patient) => (
                  <div key={patient.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-medium w-8 text-center">{patient.bedNumber}</span>
                      <div>
                        <p className="text-sm font-medium">{patient.lastName}, {patient.firstName}</p>
                        <p className="text-xs text-ward-muted">{patient.primaryDiagnosis}</p>
                      </div>
                    </div>
                    <Badge
                      variant={patient.acuity <= 2 ? 'danger' : patient.acuity === 3 ? 'warning' : 'success'}
                      size="sm"
                    >
                      {ACUITY_LEVELS[(patient.acuity >= 1 && patient.acuity <= 5 ? patient.acuity : 3) as keyof typeof ACUITY_LEVELS].label}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

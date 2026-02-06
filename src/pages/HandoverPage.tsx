import { useState } from 'react'
import { ArrowRightLeft, Download, Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { usePatientStore } from '@/stores/patientStore'
import { generateHandoverSummary } from '@/services/ai/claude'
import { exportHandoverReport } from '@/services/export/pdfExport'
import { ACUITY_LEVELS } from '@/config/constants'

export function HandoverPage() {
  const patients = usePatientStore((s) => s.patients)
  const [summary, setSummary] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const patientData = patients
        .map((p) => `${p.firstName} ${p.lastName} (Bed ${p.bedNumber}, Acuity ${p.acuity}): ${p.primaryDiagnosis}`)
        .join('\n')
      const result = await generateHandoverSummary(patientData)
      setSummary(result)
    } catch {
      setSummary('Failed to generate handover summary. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = () => {
    if (!summary) return
    exportHandoverReport(
      'Ward',
      summary,
      patients.map((p) => ({
        name: `${p.firstName} ${p.lastName}`,
        bed: p.bedNumber,
        summary: p.primaryDiagnosis,
      }))
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ward-text flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6" /> Handover
          </h1>
          <p className="text-sm text-ward-muted mt-1">Generate shift handover reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExport} disabled={!summary}>
            Export PDF
          </Button>
          <Button size="sm" icon={<Sparkles className="h-4 w-4" />} onClick={handleGenerate} loading={generating}>
            Generate Summary
          </Button>
        </div>
      </div>

      {summary && (
        <Card>
          <CardHeader><CardTitle>AI-Generated Handover Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm text-ward-text">{summary}</p>
            </div>
            <p className="text-xs text-ward-muted mt-4 italic">
              AI-generated content - verify all information with primary sources.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Patient List ({patients.length})</CardTitle></CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <p className="text-ward-muted text-sm py-4 text-center">No patients on the ward</p>
          ) : (
            <div className="divide-y divide-ward-border">
              {patients
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
                      {ACUITY_LEVELS[patient.acuity].label}
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

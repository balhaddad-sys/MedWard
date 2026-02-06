import { useState } from 'react'
import { ArrowRightLeft, Download, Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { usePatientStore } from '@/stores/patientStore'
import { generateHandoverSummary } from '@/services/ai/claude'
import { exportHandoverReport } from '@/services/export/pdfExport'
import { ACUITY_LEVELS } from '@/config/constants'

/* ------------------------------------------------------------------ */
/*  Skeleton blocks for the generating state                          */
/* ------------------------------------------------------------------ */

function HandoverSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generating Handover Summary...</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  SBAR empty state template                                         */
/* ------------------------------------------------------------------ */

function SBAREmptyTemplate() {
  const sections = [
    {
      letter: 'S',
      title: 'Situation',
      hint: 'Current state of the ward, census, and acute concerns.',
    },
    {
      letter: 'B',
      title: 'Background',
      hint: 'Relevant patient histories, recent admissions, and discharges.',
    },
    {
      letter: 'A',
      title: 'Assessment',
      hint: 'Clinical assessment of critical patients and pending results.',
    },
    {
      letter: 'R',
      title: 'Recommendation',
      hint: 'Recommended actions, follow-ups, and escalation plans.',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Handover Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.letter} className="border border-dashed border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-gray-100 text-xs font-bold text-gray-400">
                  {section.letter}
                </span>
                <span className="text-sm font-semibold text-gray-400">{section.title}</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-50 rounded w-4/5" />
                <div className="h-3 bg-gray-50 rounded w-3/5" />
              </div>
              <p className="text-[11px] text-gray-400 mt-2 italic">{section.hint}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-ward-muted text-center mt-5">
          Generate a summary to fill in the SBAR template above.
        </p>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  HandoverPage                                                       */
/* ------------------------------------------------------------------ */

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

  const isEmpty = patients.length === 0 && !summary

  return (
    <div className="space-y-3 animate-fade-in pb-32 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ward-text flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> Handover
          </h1>
          <p className="text-sm text-ward-muted mt-1 hidden sm:block">Generate shift handover reports</p>
        </div>

        {/* Desktop action buttons -- hidden on mobile, shown in sticky bar */}
        <div className="hidden md:flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            disabled={!summary}
          >
            Export PDF
          </Button>
          <Button
            size="sm"
            icon={<Sparkles className="h-4 w-4" />}
            onClick={handleGenerate}
            loading={generating}
          >
            Generate Summary
          </Button>
        </div>
      </div>

      {/* Summary content */}
      {generating ? (
        <HandoverSkeleton />
      ) : summary ? (
        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Handover Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm text-ward-text">{summary}</p>
            </div>
            <p className="text-xs text-ward-muted mt-4 italic">
              AI-generated content -- verify all information with primary sources.
            </p>
          </CardContent>
        </Card>
      ) : isEmpty ? (
        <SBAREmptyTemplate />
      ) : (
        <SBAREmptyTemplate />
      )}

      {/* Patient list */}
      <Card>
        <CardHeader>
          <CardTitle>Patient List ({patients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <div className="py-8 text-center">
              <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <ArrowRightLeft className="h-7 w-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-ward-text mb-1">No patients on the ward</p>
              <p className="text-xs text-ward-muted">Add patients to generate a handover report.</p>
            </div>
          ) : (
            <div className="divide-y divide-ward-border">
              {patients
                .sort((a, b) => a.acuity - b.acuity)
                .map((patient) => (
                  <div key={patient.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-medium w-8 text-center">
                        {patient.bedNumber}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {patient.lastName}, {patient.firstName}
                        </p>
                        <p className="text-xs text-ward-muted">{patient.primaryDiagnosis}</p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        patient.acuity <= 2 ? 'danger' : patient.acuity === 3 ? 'warning' : 'success'
                      }
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

      {/* Mobile sticky bottom CTA bar */}
      <div className="fixed bottom-[60px] left-0 right-0 md:hidden bg-white border-t border-ward-border shadow-lg px-4 py-3 z-20">
        <div className="flex items-center gap-3">
          <Button
            size="md"
            icon={<Sparkles className="h-4 w-4" />}
            onClick={handleGenerate}
            loading={generating}
            className="flex-1"
          >
            Generate Summary
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            disabled={!summary}
          />
        </div>
      </div>
    </div>
  )
}

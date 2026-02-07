import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Tabs } from '@/components/ui/Tabs'
import { PatientDetail } from '@/components/features/patients/PatientDetail'
import { LabPanelView } from '@/components/features/labs/LabPanelView'
import { LabTrendSummary } from '@/components/features/labs/LabTrendSummary'
import { TaskList } from '@/components/features/tasks/TaskList'
import { SafetyRails } from '@/components/features/safety/SafetyRails'
import { ExportButton } from '@/components/features/export/ExportButton'
import { usePatientStore } from '@/stores/patientStore'
import { useTaskStore } from '@/stores/taskStore'
import { getPatient } from '@/services/firebase/patients'
import { getLabPanels } from '@/services/firebase/labs'
import { exportPatientSummary, exportSBARReport } from '@/services/export/pdfExport'
import { generateSBARReport, type SBARData } from '@/services/ai/sbarGenerator'
import { analyzeLabPanel } from '@/services/ai/labAnalysis'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Patient, LabPanel, LabAIAnalysis } from '@/types'
import { FileText, ClipboardList, Sparkles, Download, Bot, Plus } from 'lucide-react'
import { LabEntryForm } from '@/components/features/labs/LabEntryForm'

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [labs, setLabs] = useState<LabPanel[]>([])  
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [showLabEntry, setShowLabEntry] = useState(false)
  const criticalValues = usePatientStore((s) => s.criticalValues)
  const tasks = useTaskStore((s) => s.tasks)

  // SBAR state
  const [sbar, setSbar] = useState<SBARData | null>(null)
  const [generatingSbar, setGeneratingSbar] = useState(false)

  // Lab AI analysis
  const [labAnalysis, setLabAnalysis] = useState<LabAIAnalysis | null>(null)
  const [analyzingLab, setAnalyzingLab] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const [p, l] = await Promise.all([getPatient(id), getLabPanels(id)])
        setPatient(p)
        setLabs(l)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!patient) {
    return <div className="text-center py-20 text-ward-muted">Patient not found</div>
  }

  const patientCriticals = criticalValues.filter((cv) => cv.patientId === id)
  const patientTasks = tasks.filter((t) => t.patientId === id)

  const handleGenerateSBAR = async () => {
    if (!patient) return
    setGeneratingSbar(true)
    try {
      const result = await generateSBARReport(patient, labs, patientTasks)
      setSbar(result)
    } catch {
      setSbar({ situation: 'Failed to generate SBAR report', background: '', assessment: '', recommendation: '' })
    } finally {
      setGeneratingSbar(false)
    }
  }

  const handleExportSBAR = () => {
    if (!patient || !sbar) return
    exportSBARReport(patient, sbar)
  }

  const handleAnalyzeLab = async (panelId: string) => {
    const panel = labs.find((l) => l.id === panelId)
    if (!panel || !patient) return
    setAnalyzingLab(true)
    try {
      const result = await analyzeLabPanel(panel, `${patient.firstName} ${patient.lastName}, ${patient.primaryDiagnosis}`)
      setLabAnalysis(result)
    } catch {
      setLabAnalysis(null)
    } finally {
      setAnalyzingLab(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'labs', label: 'Labs', count: labs.length },
    { id: 'tasks', label: 'Tasks' },
    { id: 'sbar', label: 'SBAR' },
    { id: 'safety', label: 'Safety' },
  ]

  const exportOptions = [
    { id: 'summary', label: 'Patient Summary', icon: <FileText className="h-4 w-4" />, onClick: () => exportPatientSummary(patient, labs, []) },
    { id: 'sbar', label: 'SBAR Report', icon: <ClipboardList className="h-4 w-4" />, onClick: () => { if (sbar) handleExportSBAR(); else setActiveTab('sbar'); } },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <PatientDetail patient={patient} />
        </div>
        <ExportButton options={exportOptions} />
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="space-y-4">
          {patientCriticals.length > 0 && <SafetyRails patient={patient} criticalValues={patientCriticals} />}
          <PatientDetail patient={patient} />
        </div>
      )}
      {activeTab === 'labs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setShowLabEntry(!showLabEntry)}
              className="min-h-[44px]"
            >
              {showLabEntry ? 'Cancel' : 'Add Labs'}
            </Button>
          </div>
          {showLabEntry && id && (
            <LabEntryForm
              patientId={id}
              onComplete={async () => {
                setShowLabEntry(false)
                const updatedLabs = await getLabPanels(id)
                setLabs(updatedLabs)
              }}
              onCancel={() => setShowLabEntry(false)}
            />
          )}
          <LabPanelView panels={labs} onReview={handleAnalyzeLab} />
          {analyzingLab && (
            <Card>
              <CardContent>
                <div className="flex items-center gap-3 py-4">
                  <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
                  <p className="text-sm text-ward-muted">Analyzing lab panel with AI...</p>
                </div>
              </CardContent>
            </Card>
          )}
          {labAnalysis && !analyzingLab && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary-600" />
                  <CardTitle>AI Lab Analysis</CardTitle>
                </div>
                <Badge
                  variant={
                    labAnalysis.clinicalSignificance === 'critical' ? 'danger'
                    : labAnalysis.clinicalSignificance === 'significant' ? 'warning'
                    : 'success'
                  }
                >
                  {labAnalysis.clinicalSignificance || 'routine'}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-ward-text mb-3">{labAnalysis.summary}</p>
                {(labAnalysis.keyFindings ?? []).length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-1">Key Findings</h4>
                    <ul className="space-y-1">
                      {(labAnalysis.keyFindings ?? []).map((f, i) => (
                        <li key={i} className="text-sm flex items-start gap-2"><span className="text-primary-600">•</span> {f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(labAnalysis.suggestedActions ?? []).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-1">Suggested Actions</h4>
                    <ul className="space-y-1">
                      {(labAnalysis.suggestedActions ?? []).map((a, i) => (
                        <li key={i} className="text-sm flex items-start gap-2"><span className="text-yellow-600">→</span> {a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-ward-muted mt-3 italic">AI-generated — verify with clinical judgment.</p>
              </CardContent>
            </Card>
          )}
          <LabTrendSummary trends={[]} />
        </div>
      )}
      {activeTab === 'tasks' && <TaskList />}
      {activeTab === 'sbar' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateSBAR}
              loading={generatingSbar}
              icon={<Sparkles className="h-4 w-4" />}
              className="min-h-[44px]"
            >
              {sbar ? 'Regenerate SBAR' : 'Generate SBAR'}
            </Button>
            {sbar && (
              <Button
                variant="secondary"
                onClick={handleExportSBAR}
                icon={<Download className="h-4 w-4" />}
                className="min-h-[44px]"
              >
                Export PDF
              </Button>
            )}
          </div>
          {generatingSbar && (
            <Card className="p-8">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
                <p className="text-sm text-ward-muted">Generating SBAR report with AI...</p>
              </div>
            </Card>
          )}
          {sbar && !generatingSbar && (
            <div className="space-y-3">
              {[
                { key: 'situation', title: 'S — Situation', content: sbar.situation, color: 'border-l-blue-500' },
                { key: 'background', title: 'B — Background', content: sbar.background, color: 'border-l-green-500' },
                { key: 'assessment', title: 'A — Assessment', content: sbar.assessment, color: 'border-l-yellow-500' },
                { key: 'recommendation', title: 'R — Recommendation', content: sbar.recommendation, color: 'border-l-red-500' },
              ].map((section) => (
                <Card key={section.key} className={`border-l-4 ${section.color}`}>
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-ward-text whitespace-pre-wrap">{section.content || 'No content generated'}</p>
                  </CardContent>
                </Card>
              ))}
              <p className="text-xs text-ward-muted italic text-center">
                AI-generated SBAR report — verify all information with primary sources before handover.
              </p>
            </div>
          )}
          {!sbar && !generatingSbar && (
            <Card className="p-8 text-center">
              <ClipboardList className="h-10 w-10 text-ward-muted mx-auto mb-3" />
              <p className="text-sm text-ward-muted">Click "Generate SBAR" to create an AI-powered SBAR handover report for this patient</p>
            </Card>
          )}
        </div>
      )}
      {activeTab === 'safety' && <SafetyRails patient={patient} criticalValues={patientCriticals} />}
    </div>
  )
}

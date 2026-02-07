import { useState, useEffect } from 'react'
import { FlaskConical, Sparkles, Upload, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { LabPanelView } from '@/components/features/labs/LabPanelView'
import { LabTriageView } from '@/components/features/labs/LabTriageView'
import { LabTrendSummary } from '@/components/features/labs/LabTrendSummary'
import { LabUploader } from '@/components/features/labs/LabUploader'
import { usePatientStore } from '@/stores/patientStore'
import { getLabPanels } from '@/services/firebase/labs'
import { analyzeLabPanel } from '@/services/ai/labAnalysis'
import type { LabPanel, LabAIAnalysis } from '@/types'

export function LabAnalysisPage() {
  const patients = usePatientStore((s) => s.patients)
  const [activeTab, setActiveTab] = useState('triage')
  const [allLabs, setAllLabs] = useState<LabPanel[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<LabAIAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)

  // Load labs when patient is selected
  useEffect(() => {
    if (!selectedPatientId) {
      setAllLabs([])
      return
    }
    const loadLabs = async () => {
      setLoading(true)
      try {
        const labs = await getLabPanels(selectedPatientId)
        setAllLabs(labs)
      } catch {
        setAllLabs([])
      } finally {
        setLoading(false)
      }
    }
    loadLabs()
  }, [selectedPatientId])

  const handleAnalyzePanel = async (panelId: string) => {
    const panel = allLabs.find((p) => p.id === panelId)
    if (!panel) return
    setSelectedPanelId(panelId)
    setAnalyzing(true)
    try {
      const patient = patients.find((p) => p.id === panel.patientId)
      const context = patient
        ? `${patient.firstName} ${patient.lastName}, ${patient.primaryDiagnosis}, Diagnoses: ${(patient.diagnoses || []).join(', ')}`
        : undefined
      const result = await analyzeLabPanel(panel, context)
      setAnalysisResult(result)
    } catch {
      setAnalysisResult(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const tabs = [
    { id: 'triage', label: 'Triage', icon: <FlaskConical className="h-3.5 w-3.5" /> },
    { id: 'all', label: 'All Results', count: allLabs.length },
    { id: 'upload', label: 'Upload', icon: <Upload className="h-3.5 w-3.5" /> },
  ]

  const criticalLabs = allLabs.filter((p) =>
    (p.values ?? []).some((v) => v.flag === 'critical_low' || v.flag === 'critical_high')
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ward-text flex items-center gap-2">
            <FlaskConical className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" /> Lab Analysis
          </h1>
          <p className="text-sm text-ward-muted mt-1">Review, triage, and AI-analyze laboratory results</p>
        </div>
        <div className="flex items-center gap-2">
          {criticalLabs.length > 0 && (
            <Badge variant="danger" pulse>{criticalLabs.length} critical</Badge>
          )}
        </div>
      </div>

      {/* Patient selector */}
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-ward-muted flex-shrink-0" />
          <select
            className="input-field flex-1"
            value={selectedPatientId}
            onChange={(e) => {
              setSelectedPatientId(e.target.value)
              setAnalysisResult(null)
              setSelectedPanelId(null)
            }}
          >
            <option value="">Select a patient to view labs...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.lastName}, {p.firstName} — Bed {p.bedNumber} — {p.primaryDiagnosis}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {activeTab === 'triage' && (
            <div className="space-y-4">
              {!selectedPatientId ? (
                <Card className="p-8 text-center">
                  <FlaskConical className="h-10 w-10 text-ward-muted mx-auto mb-3" />
                  <p className="text-ward-muted">Select a patient above to view lab triage</p>
                </Card>
              ) : (
                <>
                  <LabTriageView panels={allLabs} onSelectPanel={handleAnalyzePanel} />
                  {/* AI analysis result */}
                  {selectedPanelId && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary-600" />
                          <CardTitle>AI Lab Analysis</CardTitle>
                        </div>
                        {analysisResult && (
                          <Badge
                            variant={
                              analysisResult.clinicalSignificance === 'critical'
                                ? 'danger'
                                : analysisResult.clinicalSignificance === 'significant'
                                ? 'warning'
                                : 'success'
                            }
                          >
                            {analysisResult.clinicalSignificance || 'routine'}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        {analyzing ? (
                          <div className="flex items-center gap-3 py-4">
                            <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full" />
                            <p className="text-sm text-ward-muted">Analyzing lab results with AI...</p>
                          </div>
                        ) : analysisResult ? (
                          <div className="space-y-4">
                            <p className="text-sm text-ward-text">{analysisResult.summary}</p>
                            {(analysisResult.keyFindings ?? []).length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-2">Key Findings</h4>
                                <ul className="space-y-1">
                                  {(analysisResult.keyFindings ?? []).map((f, i) => (
                                    <li key={i} className="text-sm text-ward-text flex items-start gap-2">
                                      <span className="text-primary-600 mt-1">•</span> {f}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {(analysisResult.suggestedActions ?? []).length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-ward-muted uppercase tracking-wider mb-2">Suggested Actions</h4>
                                <ul className="space-y-1">
                                  {(analysisResult.suggestedActions ?? []).map((a, i) => (
                                    <li key={i} className="text-sm text-ward-text flex items-start gap-2">
                                      <span className="text-yellow-600 mt-1">→</span> {a}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <p className="text-xs text-ward-muted italic">
                              AI-generated analysis — verify with clinical judgment.
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-ward-muted py-4">
                            Click on a lab panel above to run AI analysis
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'all' && (
            <div className="space-y-4">
              {!selectedPatientId ? (
                <Card className="p-8 text-center">
                  <p className="text-ward-muted">Select a patient to view all lab results</p>
                </Card>
              ) : allLabs.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-ward-muted">No lab results found for this patient</p>
                </Card>
              ) : (
                <>
                  <LabPanelView panels={allLabs} onReview={handleAnalyzePanel} />
                  <LabTrendSummary trends={[]} />
                </>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <LabUploader patientId={selectedPatientId || undefined} />
              <Card padding="sm">
                <CardContent>
                  <p className="text-xs text-ward-muted text-center">
                    Upload lab result images to cloud storage. Use Camera on mobile to capture lab reports directly.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

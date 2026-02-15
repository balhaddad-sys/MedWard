import { Plus, Edit, Camera, FlaskConical, Bot } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LabEntryForm } from '@/components/features/labs/LabEntryForm'
import { LabUploader } from '@/components/features/labs/LabUploader'
import { EnhancedLabPanelView } from '@/components/features/labs/EnhancedLabPanelView'
import type { LabPanel, LabAIAnalysis } from '@/types'

interface LabsTabProps {
  id: string
  labs: LabPanel[]
  showLabEntry: boolean
  setShowLabEntry: (show: boolean) => void
  labEntryMode: 'manual' | 'upload'
  setLabEntryMode: (mode: 'manual' | 'upload') => void
  handleAnalyzeLab: (panelId: string) => void
  handleDeleteLab: (panelId: string) => void
  analyzingLab: boolean
  labAnalysis: LabAIAnalysis | null
  refreshLabs: () => Promise<void>
  addToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }) => void
}

export function LabsTab({
  id,
  labs,
  showLabEntry,
  setShowLabEntry,
  labEntryMode,
  setLabEntryMode,
  handleAnalyzeLab,
  handleDeleteLab,
  analyzingLab,
  labAnalysis,
  refreshLabs,
  addToast,
}: LabsTabProps) {
  const criticalPanels = labs.filter((panel) =>
    panel.values.some((value) => value.flag === 'critical_low' || value.flag === 'critical_high')
  ).length
  const flaggedPanels = labs.filter((panel) =>
    panel.values.some((value) => value.flag !== 'normal')
  ).length

  return (
    <div className="space-y-4">
      {!showLabEntry && (
        <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white border border-blue-100 text-blue-700">
              {labs.length} panels
            </span>
            {flaggedPanels > 0 && (
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-700">
                {flaggedPanels} flagged
              </span>
            )}
            {criticalPanels > 0 && (
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-red-100 border border-red-200 text-red-700">
                {criticalPanels} critical
              </span>
            )}
          </div>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowLabEntry(true)} className="min-h-[44px] sm:self-auto self-start">
            Add Labs
          </Button>
        </div>
      )}

      {showLabEntry && (
        <div className="space-y-3">
          {/* Manual vs Upload toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setLabEntryMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                labEntryMode === 'manual'
                  ? 'bg-primary-600 text-white'
                  : 'bg-ward-card border border-ward-border text-ward-muted hover:text-ward-text'
              }`}
            >
              <Edit className="h-4 w-4" />
              Manual Entry
            </button>
            <button
              onClick={() => setLabEntryMode('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                labEntryMode === 'upload'
                  ? 'bg-primary-600 text-white'
                  : 'bg-ward-card border border-ward-border text-ward-muted hover:text-ward-text'
              }`}
            >
              <Camera className="h-4 w-4" />
              Upload Image
            </button>
          </div>

          {labEntryMode === 'manual' && (
            <LabEntryForm
              patientId={id}
              onComplete={async () => {
                setShowLabEntry(false)
                await refreshLabs()
              }}
              onCancel={() => setShowLabEntry(false)}
            />
          )}

          {labEntryMode === 'upload' && (
            <div className="space-y-3">
              <LabUploader
                patientId={id}
                onUploadComplete={async () => {
                  await refreshLabs()
                  addToast({ type: 'info', title: 'Image uploaded', message: 'You can now add the lab values manually if needed.' })
                }}
                onManualEntry={() => setLabEntryMode('manual')}
              />
              <button
                onClick={() => setShowLabEntry(false)}
                className="w-full py-2 text-sm text-ward-muted hover:text-ward-text transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {labs.length === 0 && !showLabEntry ? (
        <Card className="p-8 text-center">
          <FlaskConical className="h-10 w-10 text-ward-muted mx-auto mb-3" />
          <p className="text-sm text-ward-muted mb-3">No lab results yet</p>
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowLabEntry(true)} className="min-h-[44px]">
            Add First Lab Panel
          </Button>
        </Card>
      ) : (
        <>
          <EnhancedLabPanelView panels={labs} onReview={handleAnalyzeLab} onDelete={handleDeleteLab} />
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
                <Badge variant={labAnalysis.clinicalSignificance === 'critical' ? 'danger' : labAnalysis.clinicalSignificance === 'significant' ? 'warning' : 'success'}>
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
        </>
      )}
    </div>
  )
}

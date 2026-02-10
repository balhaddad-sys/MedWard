import { Sparkles, Download, ClipboardList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Markdown } from '@/components/ui/Markdown'
import type { SBARData } from '@/services/ai/sbarGenerator'

interface SBARTabProps {
  sbar: SBARData | null
  generatingSbar: boolean
  handleGenerateSBAR: () => void
  handleExportSBAR: () => void
}

export function SBARTab({ sbar, generatingSbar, handleGenerateSBAR, handleExportSBAR }: SBARTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleGenerateSBAR} loading={generatingSbar} icon={<Sparkles className="h-4 w-4" />} className="min-h-[44px]">
          {sbar ? 'Regenerate' : 'Generate SBAR'}
        </Button>
        {sbar && (
          <Button variant="secondary" onClick={handleExportSBAR} icon={<Download className="h-4 w-4" />} className="min-h-[44px]">
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
        <div className="space-y-2">
          {[
            { key: 'situation', title: 'S — Situation', content: sbar.situation, color: 'border-l-blue-500' },
            { key: 'background', title: 'B — Background', content: sbar.background, color: 'border-l-green-500' },
            { key: 'assessment', title: 'A — Assessment', content: sbar.assessment, color: 'border-l-yellow-500' },
            { key: 'recommendation', title: 'R — Recommendation', content: sbar.recommendation, color: 'border-l-red-500' },
          ].map((section) => (
            <Card key={section.key} className={`border-l-4 ${section.color}`}>
              <CardContent>
                <h4 className="text-xs font-bold text-ward-muted uppercase tracking-wider mb-1">{section.title}</h4>
                <Markdown content={section.content || '—'} className="text-ward-text" />
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-ward-muted italic text-center">AI-generated — verify before handover.</p>
        </div>
      )}
      {!sbar && !generatingSbar && (
        <Card className="p-8 text-center">
          <ClipboardList className="h-10 w-10 text-ward-muted mx-auto mb-3" />
          <p className="text-sm text-ward-muted">Generate an AI-powered SBAR handover report</p>
        </Card>
      )}
    </div>
  )
}

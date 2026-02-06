import { AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { LabPanel } from '@/types'
import { formatTimestamp } from '@/utils/formatters'
import { getLabFlagColor } from '@/utils/labUtils'
import { clsx } from 'clsx'

interface LabTriageViewProps {
  panels: LabPanel[]
  onSelectPanel?: (panelId: string) => void
}

export function LabTriageView({ panels, onSelectPanel }: LabTriageViewProps) {
  const triagePanels = panels
    .filter((p) => p.values.some((v) => v.flag !== 'normal'))
    .sort((a, b) => {
      const aCrit = a.values.filter((v) => v.flag.startsWith('critical')).length
      const bCrit = b.values.filter((v) => v.flag.startsWith('critical')).length
      return bCrit - aCrit
    })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <h2 className="section-title">Lab Triage ({triagePanels.length} abnormal panels)</h2>
      </div>
      {triagePanels.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-ward-muted">No abnormal lab results to triage</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {triagePanels.map((panel) => {
            const criticalCount = panel.values.filter((v) => v.flag.startsWith('critical')).length
            const abnormalCount = panel.values.filter((v) => v.flag !== 'normal').length
            return (
              <Card key={panel.id} hover onClick={() => onSelectPanel?.(panel.id)}>
                <CardHeader>
                  <div>
                    <CardTitle>{panel.panelName}</CardTitle>
                    <p className="text-xs text-ward-muted">{formatTimestamp(panel.collectedAt)}</p>
                  </div>
                  <div className="flex gap-1">
                    {criticalCount > 0 && <Badge variant="danger" pulse>{criticalCount} critical</Badge>}
                    <Badge variant="warning">{abnormalCount} abnormal</Badge>
                  </div>
                </CardHeader>
                <div className="flex flex-wrap gap-2 mt-2">
                  {panel.values.filter((v) => v.flag !== 'normal').map((v) => (
                    <span key={v.name} className={clsx('text-xs font-mono', getLabFlagColor(v.flag))}>
                      {v.name}: {v.value} {v.unit}
                    </span>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

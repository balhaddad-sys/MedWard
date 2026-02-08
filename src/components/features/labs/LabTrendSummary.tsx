import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Sparkline } from '@/components/ui/Sparkline'
import type { LabTrend } from '@/types'

interface LabTrendSummaryProps {
  trends: LabTrend[]
}

export function LabTrendSummary({ trends }: LabTrendSummaryProps) {
  if (trends.length === 0) return null

  const getTrendIcon = (direction: LabTrend['direction']) => {
    switch (direction) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-orange-500" />
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-blue-500" />
      default: return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Lab Trends</CardTitle></CardHeader>
      <div className="space-y-3">
        {trends.map((trend) => (
          <div key={trend.labName} className="flex items-center gap-3 py-2 border-b border-ward-border last:border-0">
            {getTrendIcon(trend.direction)}
            <div className="flex-1">
              <p className="text-sm font-medium">{trend.labName}</p>
              <p className="text-xs text-ward-muted">{trend.interpretation}</p>
            </div>
            <Sparkline
              data={trend.values.map((v) => v.value)}
              width={80}
              height={24}
              color={trend.direction === 'increasing' ? '#f97316' : trend.direction === 'decreasing' ? '#3b82f6' : '#9ca3af'}
              showDots
            />
          </div>
        ))}
      </div>
    </Card>
  )
}

import type { LabPanel, LabTrend } from '@/types'

export interface DeltaResult {
  labName: string
  currentValue: number
  previousValue: number
  delta: number
  deltaPercent: number
  direction: 'up' | 'down' | 'stable'
  significance: 'critical' | 'significant' | 'minor' | 'none'
}

const SIGNIFICANCE_THRESHOLDS: Record<string, { significant: number; critical: number }> = {
  HGB: { significant: 1.0, critical: 2.0 },
  PLT: { significant: 30, critical: 50 },
  WBC: { significant: 3.0, critical: 10.0 },
  NA: { significant: 3, critical: 6 },
  K: { significant: 0.5, critical: 1.0 },
  CR: { significant: 0.3, critical: 0.5 },
  GLU: { significant: 50, critical: 100 },
  TROP: { significant: 0.02, critical: 0.1 },
  LACT: { significant: 0.5, critical: 1.5 },
  INR: { significant: 0.3, critical: 1.0 },
}

export const calculateDeltas = (
  currentPanel: LabPanel,
  previousPanel: LabPanel | null
): DeltaResult[] => {
  if (!previousPanel) return []

  const results: DeltaResult[] = []

  for (const currentValue of (currentPanel.values ?? [])) {
    if (typeof currentValue.value !== 'number') continue

    const previousValue = (previousPanel.values ?? []).find((v) => v.name === currentValue.name)
    if (!previousValue || typeof previousValue.value !== 'number') continue

    const delta = currentValue.value - (previousValue.value as number)
    const absDelta = Math.abs(delta)
    const deltaPercent =
      previousValue.value !== 0 ? (delta / (previousValue.value as number)) * 100 : 0

    const direction: 'up' | 'down' | 'stable' =
      absDelta < 0.01 ? 'stable' : delta > 0 ? 'up' : 'down'

    const threshold = SIGNIFICANCE_THRESHOLDS[(currentValue.name || '').toUpperCase()]
    let significance: DeltaResult['significance'] = 'none'
    if (threshold) {
      if (absDelta >= threshold.critical) significance = 'critical'
      else if (absDelta >= threshold.significant) significance = 'significant'
      else if (absDelta > 0) significance = 'minor'
    } else if (Math.abs(deltaPercent) >= 20) {
      significance = 'significant'
    } else if (Math.abs(deltaPercent) >= 10) {
      significance = 'minor'
    }

    results.push({
      labName: currentValue.name,
      currentValue: currentValue.value,
      previousValue: previousValue.value as number,
      delta: Math.round(delta * 100) / 100,
      deltaPercent: Math.round(deltaPercent * 10) / 10,
      direction,
      significance,
    })
  }

  return results
}

export const analyzeTrend = (panels: LabPanel[], labName: string): LabTrend | null => {
  const values: { date: LabTrend['values'][0]['date']; value: number }[] = []

  for (const panel of panels) {
    const labValue = (panel.values ?? []).find((v) => v.name === labName)
    if (labValue && typeof labValue.value === 'number') {
      values.push({ date: panel.collectedAt, value: labValue.value })
    }
  }

  if (values.length < 2) return null

  values.sort((a, b) => (a.date?.seconds ?? 0) - (b.date?.seconds ?? 0))

  const first = values[0].value
  const last = values[values.length - 1].value
  const change = last - first
  const changePercent = (change / first) * 100

  let direction: LabTrend['direction']
  if (Math.abs(changePercent) < 5) direction = 'stable'
  else if (changePercent > 0) direction = 'increasing'
  else direction = 'decreasing'

  const fluctuation = values.reduce((sum, v, i) => {
    if (i === 0) return 0
    return sum + Math.abs(v.value - values[i - 1].value)
  }, 0)
  if (fluctuation > Math.abs(change) * 2) direction = 'fluctuating'

  return {
    labName,
    direction,
    values,
    interpretation: `${labName} is ${direction} (${change > 0 ? '+' : ''}${changePercent.toFixed(1)}% over ${values.length} results)`,
  }
}

export const getDeltaColor = (significance: DeltaResult['significance']): string => {
  switch (significance) {
    case 'critical': return 'text-red-600'
    case 'significant': return 'text-orange-600'
    case 'minor': return 'text-yellow-600'
    default: return 'text-gray-500'
  }
}

export const getDeltaArrow = (direction: DeltaResult['direction']): string => {
  switch (direction) {
    case 'up': return '↑'
    case 'down': return '↓'
    default: return '→'
  }
}

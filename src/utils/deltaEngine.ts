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

// Thresholds in Kuwait SI units (mmol/L, umol/L, etc.)
const SIGNIFICANCE_THRESHOLDS: Record<string, { significant: number; critical: number }> = {
  HGB: { significant: 1.0, critical: 2.0 },         // g/dL
  PLT: { significant: 30, critical: 50 },            // x10⁹/L
  WBC: { significant: 3.0, critical: 10.0 },         // x10⁹/L
  NA: { significant: 3, critical: 6 },               // mmol/L
  K: { significant: 0.5, critical: 1.0 },            // mmol/L
  CR: { significant: 26, critical: 44 },             // umol/L (was 0.3/0.5 mg/dL)
  GLU: { significant: 2.8, critical: 5.5 },          // mmol/L (was 50/100 mg/dL)
  UREA: { significant: 1.5, critical: 3.0 },         // mmol/L
  CA: { significant: 0.15, critical: 0.30 },         // mmol/L
  TROP: { significant: 0.02, critical: 0.1 },        // ng/mL
  LACT: { significant: 0.5, critical: 1.5 },         // mmol/L
  INR: { significant: 0.3, critical: 1.0 },          // ratio
  TBILI: { significant: 5, critical: 15 },            // umol/L
  MG: { significant: 0.1, critical: 0.2 },           // mmol/L
  PO4: { significant: 0.15, critical: 0.3 },         // mmol/L
}

export const calculateDeltas = (
  currentPanel: LabPanel,
  previousPanel: LabPanel | null
): DeltaResult[] => {
  if (!previousPanel) return []

  const results: DeltaResult[] = []

  for (const currentValue of (currentPanel.values ?? [])) {
    const currNum = typeof currentValue.value === 'number'
      ? currentValue.value
      : parseFloat(String(currentValue.value))
    if (isNaN(currNum)) continue

    // Match by analyteKey first (canonical), fall back to name
    const previousValue = (previousPanel.values ?? []).find((v) =>
      (currentValue.analyteKey && v.analyteKey && v.analyteKey === currentValue.analyteKey) ||
      v.name === currentValue.name
    )
    if (!previousValue) continue
    const prevNum = typeof previousValue.value === 'number'
      ? previousValue.value
      : parseFloat(String(previousValue.value))
    if (isNaN(prevNum)) continue

    const delta = currNum - prevNum
    const absDelta = Math.abs(delta)
    const deltaPercent =
      prevNum !== 0 ? (delta / prevNum) * 100 : 0

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
      currentValue: currNum,
      previousValue: prevNum,
      delta: Math.round(delta * 100) / 100,
      deltaPercent: Math.round(deltaPercent * 10) / 10,
      direction,
      significance,
    })
  }

  return results
}

export const analyzeTrend = (panels: LabPanel[], labName: string, analyteKey?: string): LabTrend | null => {
  const values: { date: LabTrend['values'][0]['date']; value: number }[] = []

  for (const panel of panels) {
    // Match by analyteKey first (canonical), fall back to name
    const labValue = (panel.values ?? []).find((v) =>
      (analyteKey && v.analyteKey && v.analyteKey === analyteKey) ||
      v.name === labName
    )
    if (!labValue) continue
    // Values may be stored as strings from AI extraction — parse them
    const numVal = typeof labValue.value === 'number'
      ? labValue.value
      : parseFloat(String(labValue.value))
    if (!isNaN(numVal)) {
      values.push({ date: panel.collectedAt, value: numVal })
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

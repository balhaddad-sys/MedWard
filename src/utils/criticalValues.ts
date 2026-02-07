import type { LabValue, LabPanel } from '@/types'

export interface CriticalAlert {
  labName: string
  value: number | string
  unit: string
  flag: 'critical_low' | 'critical_high'
  message: string
  urgency: 'immediate' | 'urgent'
}

export const checkCriticalValues = (panel: LabPanel): CriticalAlert[] => {
  const alerts: CriticalAlert[] = []

  for (const value of (panel.values ?? [])) {
    if (value.flag === 'critical_low' || value.flag === 'critical_high') {
      alerts.push({
        labName: value.name,
        value: value.value,
        unit: value.unit,
        flag: value.flag,
        message: getCriticalMessage(value),
        urgency: getUrgency(value),
      })
    }
  }

  return alerts
}

const getCriticalMessage = (value: LabValue): string => {
  const direction = value.flag === 'critical_high' ? 'critically elevated' : 'critically low'
  return `${value.name} is ${direction} at ${value.value} ${value.unit}`
}

const getUrgency = (value: LabValue): 'immediate' | 'urgent' => {
  const immediateTests = ['K', 'NA', 'GLU', 'TROP', 'HGB', 'PLT', 'LACT']
  const testCode = (value.name || '').toUpperCase().replace(/\s/g, '')
  return immediateTests.some((t) => testCode.includes(t)) ? 'immediate' : 'urgent'
}

export const formatCriticalAlert = (alert: CriticalAlert): string => {
  const prefix = alert.urgency === 'immediate' ? 'CRITICAL' : 'URGENT'
  return `[${prefix}] ${alert.message}`
}

export const hasCriticalValues = (panels: LabPanel[]): boolean => {
  return (panels ?? []).some((panel) =>
    (panel.values ?? []).some((v) => v.flag === 'critical_low' || v.flag === 'critical_high')
  )
}

export const getCriticalCount = (panels: LabPanel[]): number => {
  return (panels ?? []).reduce(
    (count, panel) =>
      count + (panel.values ?? []).filter((v) => v.flag === 'critical_low' || v.flag === 'critical_high').length,
    0
  )
}

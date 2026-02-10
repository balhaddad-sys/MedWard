import { describe, it, expect } from 'vitest'
import { calculateDeltas, getDeltaColor, getDeltaArrow } from '../deltaEngine'
import type { LabPanel } from '@/types'

const makePanel = (values: Array<{ name: string; value: number }>): LabPanel => ({
  id: '1',
  patientId: 'p1',
  category: 'BMP',
  panelName: 'Test',
  collectedAt: {} as LabPanel['collectedAt'],
  resultedAt: {} as LabPanel['resultedAt'],
  orderedBy: 'Dr. Test',
  status: 'resulted',
  source: 'manual',
  createdAt: {} as LabPanel['createdAt'],
  values: values.map((v) => ({
    name: v.name,
    value: v.value,
    unit: 'mg/dL',
    flag: 'normal' as const,
  })),
})

describe('calculateDeltas', () => {
  it('returns empty array when no previous panel', () => {
    const current = makePanel([{ name: 'K', value: 4.0 }])
    expect(calculateDeltas(current, null)).toEqual([])
  })

  it('calculates delta between two panels', () => {
    const previous = makePanel([{ name: 'K', value: 3.5 }])
    const current = makePanel([{ name: 'K', value: 4.0 }])
    const deltas = calculateDeltas(current, previous)
    expect(deltas).toHaveLength(1)
    expect(deltas[0].delta).toBe(0.5)
    expect(deltas[0].direction).toBe('up')
  })

  it('marks stable when delta is near zero', () => {
    const previous = makePanel([{ name: 'NA', value: 140 }])
    const current = makePanel([{ name: 'NA', value: 140 }])
    const deltas = calculateDeltas(current, previous)
    expect(deltas[0].direction).toBe('stable')
  })

  it('detects critical significance for K change of 1.0', () => {
    const previous = makePanel([{ name: 'K', value: 4.0 }])
    const current = makePanel([{ name: 'K', value: 5.0 }])
    const deltas = calculateDeltas(current, previous)
    expect(deltas[0].significance).toBe('critical')
  })

  it('detects significant change for known analytes', () => {
    const previous = makePanel([{ name: 'K', value: 4.0 }])
    const current = makePanel([{ name: 'K', value: 4.6 }])
    const deltas = calculateDeltas(current, previous)
    expect(deltas[0].significance).toBe('significant')
  })

  it('skips values not in both panels', () => {
    const previous = makePanel([{ name: 'K', value: 4.0 }])
    const current = makePanel([{ name: 'NA', value: 140 }])
    const deltas = calculateDeltas(current, previous)
    expect(deltas).toHaveLength(0)
  })
})

describe('getDeltaColor', () => {
  it('returns red for critical', () => {
    expect(getDeltaColor('critical')).toBe('text-red-600')
  })

  it('returns orange for significant', () => {
    expect(getDeltaColor('significant')).toBe('text-orange-600')
  })

  it('returns yellow for minor', () => {
    expect(getDeltaColor('minor')).toBe('text-yellow-600')
  })

  it('returns gray for none', () => {
    expect(getDeltaColor('none')).toBe('text-gray-500')
  })
})

describe('getDeltaArrow', () => {
  it('returns up arrow', () => {
    expect(getDeltaArrow('up')).toBe('↑')
  })

  it('returns down arrow', () => {
    expect(getDeltaArrow('down')).toBe('↓')
  })

  it('returns right arrow for stable', () => {
    expect(getDeltaArrow('stable')).toBe('→')
  })
})

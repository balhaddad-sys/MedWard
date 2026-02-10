import { describe, it, expect } from 'vitest'
import { calculateGFR, getGFRStage, formatGFR } from '../gfrCalculator'

describe('calculateGFR', () => {
  it('returns normal GFR for young healthy male', () => {
    const gfr = calculateGFR(0.9, 25, 'male')
    expect(gfr).toBeGreaterThan(90)
  })

  it('returns normal GFR for young healthy female', () => {
    const gfr = calculateGFR(0.7, 25, 'female')
    expect(gfr).toBeGreaterThan(90)
  })

  it('returns lower GFR for elevated creatinine', () => {
    const normal = calculateGFR(0.9, 40, 'male')
    const elevated = calculateGFR(2.5, 40, 'male')
    expect(elevated).toBeLessThan(normal)
  })

  it('returns lower GFR for older age', () => {
    const young = calculateGFR(1.0, 25, 'male')
    const old = calculateGFR(1.0, 80, 'male')
    expect(old).toBeLessThan(young)
  })

  it('returns a rounded integer', () => {
    const gfr = calculateGFR(1.2, 55, 'female')
    expect(gfr).toBe(Math.round(gfr))
  })

  it('handles very high creatinine (kidney failure)', () => {
    const gfr = calculateGFR(8.0, 60, 'male')
    expect(gfr).toBeLessThan(15)
  })
})

describe('getGFRStage', () => {
  it('returns G1 for GFR >= 90', () => {
    expect(getGFRStage(95)).toEqual({ stage: 'G1', description: 'Normal or high', color: 'text-green-600' })
  })

  it('returns G2 for GFR 60-89', () => {
    expect(getGFRStage(75).stage).toBe('G2')
  })

  it('returns G3a for GFR 45-59', () => {
    expect(getGFRStage(50).stage).toBe('G3a')
  })

  it('returns G3b for GFR 30-44', () => {
    expect(getGFRStage(35).stage).toBe('G3b')
  })

  it('returns G4 for GFR 15-29', () => {
    expect(getGFRStage(20).stage).toBe('G4')
  })

  it('returns G5 for GFR < 15', () => {
    expect(getGFRStage(10).stage).toBe('G5')
  })
})

describe('formatGFR', () => {
  it('formats normal GFR', () => {
    expect(formatGFR(85)).toBe('85 mL/min/1.73m²')
  })

  it('formats high GFR with > sign', () => {
    expect(formatGFR(125)).toBe('>120 mL/min/1.73m²')
  })
})

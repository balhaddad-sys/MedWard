import { describe, it, expect } from 'vitest'
import {
  formatPatientName,
  formatAge,
  formatDate,
  formatLabValue,
  formatDelta,
  formatDeltaPercent,
  formatMRN,
} from '../formatters'

describe('formatPatientName', () => {
  it('formats as LAST, First', () => {
    expect(formatPatientName('John', 'Doe')).toBe('DOE, John')
  })

  it('handles missing last name', () => {
    expect(formatPatientName('John', null)).toBe(', John')
  })

  it('handles missing first name', () => {
    expect(formatPatientName(null, 'Doe')).toBe('DOE, ')
  })

  it('handles both missing', () => {
    expect(formatPatientName(null, null)).toBe(', ')
  })
})

describe('formatAge', () => {
  it('returns empty for null input', () => {
    expect(formatAge(null)).toBe('')
  })

  it('returns empty for undefined', () => {
    expect(formatAge(undefined)).toBe('')
  })

  it('returns age with y suffix for valid date', () => {
    const result = formatAge('1990-01-01')
    expect(result).toMatch(/^\d+y$/)
    const age = parseInt(result)
    expect(age).toBeGreaterThanOrEqual(35)
    expect(age).toBeLessThanOrEqual(37)
  })

  it('returns empty for invalid date', () => {
    expect(formatAge('not-a-date')).toBe('')
  })
})

describe('formatDate', () => {
  it('returns N/A for null', () => {
    expect(formatDate(null)).toBe('N/A')
  })

  it('formats ISO date string', () => {
    expect(formatDate('2024-03-15')).toBe('15 Mar 2024')
  })

  it('returns N/A for invalid date', () => {
    expect(formatDate('garbage')).toBe('N/A')
  })
})

describe('formatLabValue', () => {
  it('formats number to 1 decimal', () => {
    expect(formatLabValue(3.456)).toBe('3.5')
  })

  it('formats number with custom decimals', () => {
    expect(formatLabValue(3.456, 2)).toBe('3.46')
  })

  it('returns string values as-is', () => {
    expect(formatLabValue('positive' as unknown as number)).toBe('positive')
  })
})

describe('formatDelta', () => {
  it('formats positive delta with + sign', () => {
    expect(formatDelta(1.5, 'mg/dL')).toBe('+1.5 mg/dL')
  })

  it('formats negative delta', () => {
    expect(formatDelta(-2.3, 'mmol/L')).toBe('-2.3 mmol/L')
  })

  it('formats zero delta', () => {
    expect(formatDelta(0, 'mg/dL')).toBe('0.0 mg/dL')
  })
})

describe('formatDeltaPercent', () => {
  it('formats positive percent', () => {
    expect(formatDeltaPercent(15.5)).toBe('+15.5%')
  })

  it('formats negative percent', () => {
    expect(formatDeltaPercent(-8.3)).toBe('-8.3%')
  })
})

describe('formatMRN', () => {
  it('returns empty for null', () => {
    expect(formatMRN(null)).toBe('')
  })

  it('formats 9-digit MRN with hyphens', () => {
    expect(formatMRN('123456789')).toBe('123-456-789')
  })

  it('returns short MRN as-is', () => {
    expect(formatMRN('12345')).toBe('12345')
  })
})

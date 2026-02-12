import { describe, it, expect } from 'vitest'
import {
  validateMRN,
  validateBedNumber,
  validateEmail,
  validateRequired,
  validateLabValue,
  validatePatientForm,
} from '../validators'

describe('validateMRN', () => {
  it('accepts 6-digit MRN', () => {
    expect(validateMRN('123456')).toBe(true)
  })

  it('accepts 10-digit MRN', () => {
    expect(validateMRN('1234567890')).toBe(true)
  })

  it('accepts MRN with hyphens', () => {
    expect(validateMRN('123-456-789')).toBe(true)
  })

  it('rejects MRN with less than 6 digits', () => {
    expect(validateMRN('12345')).toBe(false)
  })

  it('rejects MRN with more than 10 digits', () => {
    expect(validateMRN('12345678901')).toBe(false)
  })

  it('rejects MRN with letters', () => {
    expect(validateMRN('123abc')).toBe(false)
  })
})

describe('validateBedNumber', () => {
  it('accepts numeric bed', () => {
    expect(validateBedNumber('401')).toBe(true)
  })

  it('accepts letter prefix', () => {
    expect(validateBedNumber('A12')).toBe(true)
  })

  it('accepts letter suffix', () => {
    expect(validateBedNumber('12B')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(validateBedNumber('')).toBe(false)
  })

  it('rejects special characters', () => {
    expect(validateBedNumber('A-12')).toBe(false)
  })
})

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('rejects email without @', () => {
    expect(validateEmail('userexample.com')).toBe(false)
  })

  it('rejects email without domain', () => {
    expect(validateEmail('user@')).toBe(false)
  })
})

describe('validateRequired', () => {
  it('returns true for non-empty string', () => {
    expect(validateRequired('hello')).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(validateRequired('')).toBe(false)
  })

  it('returns false for whitespace only', () => {
    expect(validateRequired('   ')).toBe(false)
  })
})

describe('validateLabValue', () => {
  it('returns normal when within range', () => {
    expect(validateLabValue(5, 3, 10)).toBe('normal')
  })

  it('returns low when below min', () => {
    expect(validateLabValue(2, 3, 10)).toBe('low')
  })

  it('returns high when above max', () => {
    expect(validateLabValue(11, 3, 10)).toBe('high')
  })

  it('returns normal when no bounds given', () => {
    expect(validateLabValue(5)).toBe('normal')
  })
})

describe('validatePatientForm', () => {
  it('returns no errors for valid data', () => {
    const errors = validatePatientForm({
      mrn: '123456',
      firstName: 'John',
      lastName: 'Doe',
      bedNumber: 'A12',
      primaryDiagnosis: 'Pneumonia',
    })
    expect(errors).toHaveLength(0)
  })

  it('returns no errors for missing fields (all fields optional)', () => {
    const errors = validatePatientForm({})
    expect(errors).toHaveLength(0)
  })

  it('returns error for invalid MRN', () => {
    const errors = validatePatientForm({
      mrn: 'abc',
      firstName: 'John',
      lastName: 'Doe',
      bedNumber: 'A12',
      primaryDiagnosis: 'Pneumonia',
    })
    expect(errors.some((e) => e.field === 'mrn')).toBe(true)
  })

  it('returns error for invalid bed number', () => {
    const errors = validatePatientForm({
      mrn: '123456',
      firstName: 'John',
      lastName: 'Doe',
      bedNumber: '##invalid##',
      primaryDiagnosis: 'Pneumonia',
    })
    expect(errors.some((e) => e.field === 'bedNumber')).toBe(true)
  })
})

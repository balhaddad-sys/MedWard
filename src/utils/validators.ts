export const validateMRN = (mrn: string): boolean => {
  return /^\d{6,10}$/.test(mrn.replace(/-/g, ''))
}

export const validateBedNumber = (bed: string): boolean => {
  return /^[A-Z]?\d{1,4}[A-Z]?$/i.test(bed)
}

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0
}

export const validateLabValue = (value: number, min?: number, max?: number): 'normal' | 'low' | 'high' => {
  if (min !== undefined && value < min) return 'low'
  if (max !== undefined && value > max) return 'high'
  return 'normal'
}

export interface ValidationError {
  field: string
  message: string
}

export const validatePatientForm = (data: Record<string, unknown>): ValidationError[] => {
  const errors: ValidationError[] = []

  const mrn = (data.mrn as string || '').trim()
  if (!mrn) {
    errors.push({ field: 'mrn', message: 'MRN is required' })
  } else if (!validateMRN(mrn)) {
    errors.push({ field: 'mrn', message: 'MRN must be 6-10 digits (hyphens allowed)' })
  }

  if (!(data.firstName as string || '').trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' })
  }

  if (!(data.lastName as string || '').trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' })
  }

  const bed = (data.bedNumber as string || '').trim()
  if (!bed) {
    errors.push({ field: 'bedNumber', message: 'Bed number is required' })
  } else if (!validateBedNumber(bed)) {
    errors.push({ field: 'bedNumber', message: 'Enter a valid bed number (e.g. A12, B3, 401)' })
  }

  if (!(data.primaryDiagnosis as string || '').trim()) {
    errors.push({ field: 'primaryDiagnosis', message: 'Primary diagnosis is required' })
  }

  return errors
}

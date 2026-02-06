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

  if (!data.mrn || !validateMRN(String(data.mrn))) {
    errors.push({ field: 'mrn', message: 'Valid MRN is required (6-10 digits)' })
  }
  if (!data.firstName || !validateRequired(String(data.firstName))) {
    errors.push({ field: 'firstName', message: 'First name is required' })
  }
  if (!data.lastName || !validateRequired(String(data.lastName))) {
    errors.push({ field: 'lastName', message: 'Last name is required' })
  }
  if (!data.dateOfBirth) {
    errors.push({ field: 'dateOfBirth', message: 'Date of birth is required' })
  }
  if (!data.primaryDiagnosis || !validateRequired(String(data.primaryDiagnosis))) {
    errors.push({ field: 'primaryDiagnosis', message: 'Primary diagnosis is required' })
  }
  if (!data.bedNumber || !validateBedNumber(String(data.bedNumber))) {
    errors.push({ field: 'bedNumber', message: 'Valid bed number is required' })
  }

  return errors
}

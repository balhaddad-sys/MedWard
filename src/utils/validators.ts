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

export const validatePatientForm = (_data: Record<string, unknown>): ValidationError[] => {
  return []
}

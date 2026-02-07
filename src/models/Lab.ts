export interface RawLabImage {
  id: string
  fileName: string
  uploadedAt: Date
  base64Data: string
  patientId: string
}

export interface AnalyzedLab {
  id: string
  patientId: string
  rawImageId: string
  uploadedAt: Date

  analyzedAt: Date
  labName?: string
  testDate?: Date

  category:
    | 'CBC'
    | 'BMP'
    | 'CMP'
    | 'LFT'
    | 'Coagulation'
    | 'Cardiac'
    | 'Thyroid'
    | 'Urinalysis'
    | 'ABG'
    | 'Custom'
    | 'Unknown'

  ocrText: string
  tests: LabTest[]
  confidence: number

  isConfirmed: boolean
  confirmedBy?: string
  confirmedAt?: Date

  notes?: string
  status: 'uploading' | 'processing' | 'pending' | 'confirmed' | 'error' | 'archived'
}

export interface LabTest {
  name: string
  value: string
  unit?: string
  refRange?: string
  isAbnormal?: boolean
}

export type LabAnalysisCategory = AnalyzedLab['category']

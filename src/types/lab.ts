import type { Timestamp } from 'firebase/firestore'

export type LabCategory = 'CBC' | 'BMP' | 'CMP' | 'LFT' | 'COAG' | 'CARDIAC' | 'THYROID' | 'UA' | 'ABG' | 'MISC'

export type LabFlag = 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high'

export interface LabValue {
  name: string
  value: number | string
  unit: string
  referenceMin?: number
  referenceMax?: number
  criticalMin?: number
  criticalMax?: number
  flag: LabFlag
  previousValue?: number | string
  delta?: number
  deltaPercent?: number
}

export interface LabPanel {
  id: string
  patientId: string
  category: LabCategory
  panelName: string
  values: LabValue[]
  collectedAt: Timestamp
  resultedAt: Timestamp
  orderedBy: string
  status: 'pending' | 'resulted' | 'reviewed'
  reviewedBy?: string
  reviewedAt?: Timestamp
  aiAnalysis?: LabAIAnalysis
  source: 'manual' | 'ocr' | 'hl7'
  createdAt: Timestamp
}

export interface LabAIAnalysis {
  summary: string
  clinicalSignificance: 'critical' | 'significant' | 'routine' | 'normal'
  keyFindings: string[]
  suggestedActions: string[]
  trends: LabTrend[]
  generatedAt: Timestamp
}

export interface LabTrend {
  labName: string
  direction: 'increasing' | 'decreasing' | 'stable' | 'fluctuating'
  values: { date: Timestamp; value: number }[]
  interpretation: string
}

export interface LabUploadResult {
  success: boolean
  panels: LabPanel[]
  errors?: string[]
  warnings?: string[]
}

export interface CriticalValue {
  labName: string
  value: number | string
  unit: string
  flag: 'critical_low' | 'critical_high'
  patientId: string
  patientName: string
  bedNumber: string
  acknowledgedBy?: string
  acknowledgedAt?: Timestamp
  notifiedAt: Timestamp
}

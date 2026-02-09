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

// --- AI Extraction Response Types (from Cloud Function) ---

export type ExtractedTrendDirection = 'improving' | 'worsening' | 'stable' | 'fluctuating'

export interface ExtractedPatientInfo {
  file_number: string
  civil_id: string
  age: string
  sex: string
  visit_number: string
  visit_date: string
}

export interface ExtractedLabResult {
  test_name: string
  test_code: string
  analyte_key: string
  value: number | null
  value_raw: string
  unit: string
  ref_low: number | null
  ref_high: number | null
  flag: LabFlag
  flag_extracted?: LabFlag
}

export interface ExtractedLabPanel {
  panel_name: string
  order_id: string
  collected_at: string
  results: ExtractedLabResult[]
}

export interface ExtractedTrend {
  analyte_key: string
  display_name: string
  direction: ExtractedTrendDirection
  pct_change: number
  latest_value: number | null
  latest_flag: LabFlag
  severity_score: number
}

export interface ExtractionResponse {
  patient: ExtractedPatientInfo
  panels: ExtractedLabPanel[]
  trends: ExtractedTrend[]
  critical_flags: ExtractedTrend[]
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

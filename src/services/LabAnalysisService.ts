import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'
import type { AnalyzedLab, RawLabImage, LabTest } from '../models/Lab'

import type { ExtractionResponse } from '@/types/lab'

interface LabImageResponse {
  content: string
  structured?: ExtractionResponse
  usage: { inputTokens: number; outputTokens: number }
}

export class LabAnalysisService {
  async analyzeLabImage(image: RawLabImage): Promise<AnalyzedLab> {
    try {
      const ocrResult = await this.runOCR(image.base64Data)
      const tests = this.parseExtractedTests(ocrResult.structured, ocrResult.text)
      const category = this.categorizeLabType(tests, ocrResult.structured, ocrResult.text)
      const metadata = this.extractMetadata(ocrResult.structured, ocrResult.text)

      return {
        id: `lab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        patientId: image.patientId,
        rawImageId: image.id,
        uploadedAt: image.uploadedAt,
        analyzedAt: new Date(),
        labName: metadata.labName,
        testDate: metadata.testDate,
        category,
        ocrText: ocrResult.text,
        tests,
        confidence: this.calculateConfidence(tests, ocrResult.structured),
        isConfirmed: false,
        status: 'pending',
      }
    } catch (error) {
      console.error('[LAB] Analysis failed:', error)
      throw new Error('Failed to analyze lab image. Please retry or enter manually.')
    }
  }

  private async runOCR(base64Image: string): Promise<{ text: string; structured?: ExtractionResponse }> {
    const imageData = base64Image.includes(',')
      ? base64Image.split(',')[1]
      : base64Image

    const fn = httpsCallable<
      { imageBase64: string; mediaType: string },
      LabImageResponse
    >(functions, 'analyzeLabImage')

    const result = await fn({
      imageBase64: imageData,
      mediaType: 'image/jpeg',
    })

    return {
      text: result.data.content,
      structured: result.data.structured,
    }
  }

  parseTests(ocrText: string): LabTest[] {
    return this.parseExtractedTests(undefined, ocrText)
  }

  private parseExtractedTests(structured?: ExtractionResponse, rawText?: string): LabTest[] {
    if (structured?.panels?.length) {
      return structured.panels.flatMap((panel) =>
        panel.results
          .filter((result) => result.test_name)
          .map((result) => {
            const refRange = this.toRefRange(result.ref_low, result.ref_high)
            const value = result.value != null ? String(result.value) : result.value_raw || '?'
            const isAbnormal = result.flag === 'high'
              || result.flag === 'low'
              || result.flag === 'critical_high'
              || result.flag === 'critical_low'

            return {
              name: result.test_name,
              value,
              unit: result.unit || undefined,
              refRange,
              isAbnormal,
            }
          })
      )
    }

    if (!rawText) return []

    return this.parseLegacyTests(rawText)
  }

  private parseLegacyTests(ocrText: string): LabTest[] {
    const lines = ocrText.split('\n')
    const tests: LabTest[] = []

    for (const line of lines) {
      if (line.startsWith('META:') || !line.includes('|')) continue

      const parts = line.split('|').map((p) => p.trim())
      if (parts.length >= 2 && parts[0] && parts[1]) {
        tests.push({
          name: parts[0],
          value: parts[1],
          unit: parts[2] && parts[2] !== '?' ? parts[2] : undefined,
          refRange: parts[3] && parts[3] !== '?' ? parts[3] : undefined,
          isAbnormal: this.checkIfAbnormal(parts[1], parts[3]),
        })
      }
    }

    return tests
  }

  categorizeLabType(
    tests: LabTest[],
    structured?: ExtractionResponse,
    ocrText = ''
  ): AnalyzedLab['category'] {
    const panelCategory = this.mapPanelCategory(structured)
    if (panelCategory) return panelCategory

    const combined = (
      ocrText +
      ' ' +
      tests.map((t) => t.name).join(' ')
    ).toLowerCase()

    const patterns: Record<string, string[]> = {
      CBC: ['wbc', 'rbc', 'hemoglobin', 'hematocrit', 'platelets', 'mcv', 'mch'],
      BMP: ['sodium', 'potassium', 'chloride', 'co2', 'bun', 'creatinine', 'glucose'],
      CMP: ['albumin', 'total protein', 'calcium', 'bilirubin', 'alkaline'],
      LFT: ['alt', 'ast', 'bilirubin', 'albumin', 'alp', 'ggt'],
      Coagulation: ['pt', 'ptt', 'inr', 'fibrinogen', 'aptt'],
      Cardiac: ['troponin', 'bnp', 'nt-probnp', 'myoglobin', 'ck-mb'],
      Thyroid: ['tsh', 't3', 't4', 'free t4', 'free t3'],
      Urinalysis: ['specific gravity', 'ph', 'leukocyte', 'nitrite', 'ketone'],
      ABG: ['pco2', 'po2', 'hco3', 'base excess', 'sao2'],
    }

    let bestMatch = 'Unknown'
    let bestScore = 0

    for (const [category, keywords] of Object.entries(patterns)) {
      const matches = keywords.filter((kw) => combined.includes(kw)).length
      if (matches > bestScore && matches >= 2) {
        bestScore = matches
        bestMatch = category
      }
    }

    return bestMatch as AnalyzedLab['category']
  }

  private extractMetadata(structured?: ExtractionResponse, ocrText = ''): {
    labName?: string
    testDate?: Date
  } {
    const firstPanel = structured?.panels?.[0]
    if (firstPanel) {
      const parsed = firstPanel.collected_at ? new Date(firstPanel.collected_at) : undefined
      return {
        labName: firstPanel.panel_name || undefined,
        testDate: parsed && !isNaN(parsed.getTime()) ? parsed : undefined,
      }
    }

    const metaLine = ocrText
      .split('\n')
      .find((l) => l.startsWith('META:'))

    let labName: string | undefined
    let testDate: Date | undefined

    if (metaLine) {
      const parts = metaLine.replace('META:', '').split('|').map((p) => p.trim())
      labName = parts[0] || undefined
      if (parts[1]) {
        const parsed = new Date(parts[1])
        if (!isNaN(parsed.getTime())) testDate = parsed
      }
    }

    if (!testDate) {
      const datePatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\d{1,2}-\d{1,2}-\d{4})/,
        /(\d{4}-\d{1,2}-\d{1,2})/,
      ]
      for (const pattern of datePatterns) {
        const match = ocrText.match(pattern)
        if (match) {
          const parsed = new Date(match[1])
          if (!isNaN(parsed.getTime())) {
            testDate = parsed
            break
          }
        }
      }
    }

    return { labName, testDate }
  }

  private toRefRange(low: number | null, high: number | null): string | undefined {
    if (low == null && high == null) return undefined
    if (low != null && high != null) return `${low}-${high}`
    if (low != null) return `>=${low}`
    return `<=${high}`
  }

  private mapPanelCategory(structured?: ExtractionResponse): AnalyzedLab['category'] | null {
    if (!structured?.panels?.length) return null

    const name = structured.panels[0].panel_name.toLowerCase()
    if (/\bcbc\b|blood count|hematology/.test(name)) return 'CBC'
    if (/\bbmp\b|basic metabolic/.test(name)) return 'BMP'
    if (/\bcmp\b|comprehensive metabolic|chemistry/.test(name)) return 'CMP'
    if (/lft|liver|hepatic/.test(name)) return 'LFT'
    if (/coag|inr|pt|aptt/.test(name)) return 'Coagulation'
    if (/cardiac|troponin|bnp|ck/.test(name)) return 'Cardiac'
    if (/thyroid|tsh|t3|t4/.test(name)) return 'Thyroid'
    if (/urinalysis|urine/.test(name)) return 'Urinalysis'
    if (/abg|arterial blood gas/.test(name)) return 'ABG'

    return null
  }

  private checkIfAbnormal(value: string, refRange?: string): boolean {
    if (!refRange || refRange === '?') return false

    const rangeParts = refRange.split('-').map((p) => p.trim())
    if (rangeParts.length !== 2) return false

    const numValue = parseFloat(value)
    const min = parseFloat(rangeParts[0])
    const max = parseFloat(rangeParts[1])

    if (isNaN(numValue) || isNaN(min) || isNaN(max)) return false

    return numValue < min || numValue > max
  }

  private calculateConfidence(tests: LabTest[], structured?: ExtractionResponse): number {
    // Structured output from the function is already normalized and validated.
    if (structured?.panels?.length) {
      const total = structured.panels.reduce((sum, panel) => sum + panel.results.length, 0)
      if (total === 0) return 0

      let complete = 0
      for (const panel of structured.panels) {
        for (const result of panel.results) {
          if (!result.test_name) continue
          if (result.value !== null || result.value_raw) complete += 1
          if (result.unit) complete += 1
          if (result.ref_low !== null || result.ref_high !== null) complete += 1
        }
      }
      const maxScore = total * 3
      return Math.round((complete / maxScore) * 100)
    }

    if (tests.length === 0) return 0

    let totalScore = 0
    for (const test of tests) {
      let testScore = 0
      if (test.name && test.name !== '?') testScore += 25
      if (test.value && test.value !== '?') testScore += 35
      if (test.unit && test.unit !== '?') testScore += 20
      if (test.refRange && test.refRange !== '?') testScore += 20
      totalScore += testScore
    }

    return Math.round(totalScore / tests.length)
  }
}

export const labService = new LabAnalysisService()

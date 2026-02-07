import type { AnalyzedLab, RawLabImage, LabTest } from '../models/Lab'

export class LabAnalysisService {
  private readonly API_ENDPOINT = 'https://api.anthropic.com/v1/messages'

  async analyzeLabImage(image: RawLabImage): Promise<AnalyzedLab> {
    try {
      const ocrResult = await this.runOCR(image.base64Data)
      const tests = this.parseTests(ocrResult.text)
      const category = this.categorizeLabType(tests, ocrResult.text)
      const metadata = this.extractMetadata(ocrResult.text)

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
        confidence: this.calculateConfidence(tests),
        isConfirmed: false,
        status: 'pending',
      }
    } catch (error) {
      console.error('[LAB] Analysis failed:', error)
      throw new Error('Failed to analyze lab image. Please retry or enter manually.')
    }
  }

  private async runOCR(base64Image: string): Promise<{ text: string }> {
    const imageData = base64Image.includes(',')
      ? base64Image.split(',')[1]
      : base64Image

    const response = await fetch(this.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageData,
                },
              },
              {
                type: 'text',
                text: `Extract ALL laboratory test results from this lab report image.

Return in this EXACT pipe-delimited format, one test per line:
Test Name | Value | Unit | Reference Range

Example:
WBC | 7.5 | 10^3/uL | 4.5-11.0
Hemoglobin | 13.2 | g/dL | 12.0-16.0

Rules:
- Include every test visible in the image
- Use "?" for any field you cannot read clearly
- Preserve original units exactly as shown
- Include the lab facility name and test date if visible, prefixed with META:
  META: Lab Name | Test Date`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OCR request failed: ${response.status}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.type === 'text' ? data.content[0].text : ''
    return { text }
  }

  parseTests(ocrText: string): LabTest[] {
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
    ocrText: string
  ): AnalyzedLab['category'] {
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

  private extractMetadata(ocrText: string): {
    labName?: string
    testDate?: Date
  } {
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

  private calculateConfidence(tests: LabTest[]): number {
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

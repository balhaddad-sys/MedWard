import { z } from 'zod'

export const LabTestSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  value: z.number({ error: 'Value must be a number' }),
  unit: z.string().default(''),
  referenceRange: z.string().optional(),
  flag: z.enum(['Normal', 'High', 'Low', 'Critical']).default('Normal'),
})

export const LabScanResultSchema = z.object({
  tests: z.array(LabTestSchema).min(1, 'At least one test required'),
  specimenType: z.enum(['Blood', 'Urine', 'CSF', 'Other']).optional(),
  collectionDate: z.string().nullable().optional(),
  labName: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  status: z.enum(['uploading', 'processing', 'completed', 'error']),
  processedAt: z.unknown().optional(),
  error: z.string().optional(),
})

export type LabTest = z.infer<typeof LabTestSchema>
export type LabScanResult = z.infer<typeof LabScanResultSchema>

export function validateLabResult(data: unknown) {
  return LabScanResultSchema.safeParse(data)
}

export function validateLabTest(data: unknown) {
  return LabTestSchema.safeParse(data)
}

export function safeParseLabResult(data: unknown): LabScanResult | null {
  const result = LabScanResultSchema.safeParse(data)
  if (result.success) return result.data
  console.error('[LabSchema] Validation failed:', result.error.issues)
  return null
}

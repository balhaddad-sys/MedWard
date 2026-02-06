import { z } from 'zod'

export const PatientValidationSchema = z.object({
  patientId: z.string(),
  name: z.string().min(1),
  mrn: z.string().optional(),
  dateOfBirth: z.string().optional(),
  bed: z.string().optional(),
  ward: z.string().optional(),
  diagnosis: z.string().optional(),
  attendingPhysician: z.string().optional(),
  admissionDate: z.unknown().optional(),
  allergies: z.array(z.string()).optional(),
  codeStatus: z.enum(['Full Code', 'DNR', 'DNI', 'Comfort Care']).optional(),
})

export type ValidatedPatient = z.infer<typeof PatientValidationSchema>

export function validatePatientData(data: unknown) {
  return PatientValidationSchema.safeParse(data)
}

import { z } from 'zod'

export const WardTaskSchema = z.object({
  taskId: z.string(),
  text: z.string().min(1, 'Task text is required'),
  status: z.enum(['open', 'done', 'deferred']).default('open'),
  createdAt: z.unknown(),
  updatedAt: z.unknown().optional(),
  createdBy: z.string().optional(),
  due: z.enum(['today', 'tomorrow']).or(z.string()).optional(),
  tag: z.enum(['labs', 'imaging', 'consult', 'meds', 'discharge', 'other']).optional(),
  priority: z.enum(['routine', 'important', 'urgent']).default('routine'),
  patientId: z.string().optional(),
})

export const WardTaskListSchema = z.array(WardTaskSchema)

export type WardTask = z.infer<typeof WardTaskSchema>

export function validateWardTask(data: unknown) {
  return WardTaskSchema.safeParse(data)
}

export function validateWardTaskList(data: unknown) {
  return WardTaskListSchema.safeParse(data)
}

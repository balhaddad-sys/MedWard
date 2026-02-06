const { z } = require("zod");

const LabTestSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
  unit: z.string().default(""),
  referenceRange: z.string().optional(),
  flag: z.enum(["Normal", "High", "Low", "Critical"]).default("Normal"),
});

const LabScanResultSchema = z.object({
  tests: z.array(LabTestSchema).min(1),
  specimenType: z.enum(["Blood", "Urine", "CSF", "Other"]).optional(),
  collectionDate: z.string().nullable().optional(),
  labName: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

function validateLabResult(data) {
  return LabScanResultSchema.safeParse(data);
}

module.exports = { LabTestSchema, LabScanResultSchema, validateLabResult };

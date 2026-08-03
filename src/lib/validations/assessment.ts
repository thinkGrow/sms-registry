import { z } from "zod";

export const assessmentCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  module: z.string().min(1, "Module is required"),
  programmeId: z.string().min(1, "Programme is required"),
  // Full datetime (not date-only): whether a submission is late depends on
  // an exact cutoff time, not just a calendar day.
  deadline: z.coerce.date(),
});

export const assessmentUpdateSchema = assessmentCreateSchema.partial();

export type AssessmentCreateInput = z.infer<typeof assessmentCreateSchema>;
export type AssessmentUpdateInput = z.infer<typeof assessmentUpdateSchema>;

import { z } from "zod";

export const enrolmentStatusValues = [
  "ENROLLED",
  "DEFERRED",
  "WITHDRAWN",
  "COMPLETED",
] as const;

export const studentCreateSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Must be a valid email address"),
  dateOfBirth: z.coerce.date(),
  programmeId: z.string().min(1, "Programme is required"),
  academicYear: z.number().int().positive(),
  status: z.enum(enrolmentStatusValues).default("ENROLLED"),
  feeOverride: z.number().positive().nullable().optional(),
});

// Partial: staff may only be updating one field (e.g. just the status),
// not resubmitting the entire record every time.
export const studentUpdateSchema = studentCreateSchema.partial();

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;

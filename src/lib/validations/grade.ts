import { z } from "zod";

export const gradeUpsertSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  assessmentId: z.string().min(1, "Assessment is required"),
  score: z.number().min(0, "Score cannot be negative").max(100, "Score cannot exceed 100"),
});

export type GradeUpsertInput = z.infer<typeof gradeUpsertSchema>;

export const gradePublishSchema = z.object({
  isPublished: z.boolean(),
});

export type GradePublishInput = z.infer<typeof gradePublishSchema>;

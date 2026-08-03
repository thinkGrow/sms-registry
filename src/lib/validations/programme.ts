import { z } from "zod";

export const degreeLevelValues = ["BACHELORS", "MASTERS"] as const;

export const programmeCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  feeAmount: z.number().positive("Fee must be a positive number"),
  degreeLevel: z.enum(degreeLevelValues),
  feeDueDate: z.coerce.date().nullable().optional(),
});

export const programmeUpdateSchema = programmeCreateSchema.partial();

export type ProgrammeCreateInput = z.infer<typeof programmeCreateSchema>;
export type ProgrammeUpdateInput = z.infer<typeof programmeUpdateSchema>;

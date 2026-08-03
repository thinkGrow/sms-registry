import { z } from "zod";

// Only the non-file fields: the uploaded file itself arrives via multipart
// FormData and is validated separately (MIME/extension check) in the route
// handler, since Zod isn't a natural fit for validating a raw File/Blob.
export const submissionCreateSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
});

export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>;

export const ACCEPTED_FILE_TYPES: Record<string, "PDF" | "DOCX"> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
};

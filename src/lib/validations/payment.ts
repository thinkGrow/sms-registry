import { z } from "zod";


export const paymentCreateSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  paidAt: z.coerce.date(),
});



// Omits studentId: correcting a mistaken amount/date is supported (ordinary
// CRUD, not a full accounting ledger), but reassigning a payment to a
// different student isn't.
export const paymentUpdateSchema = paymentCreateSchema.omit({ studentId: true }).partial();

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;


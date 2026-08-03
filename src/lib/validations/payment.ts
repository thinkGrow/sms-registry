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

// Simulated online payment: a student pays only an amount, no reference
// number or date fields, since it's "paid right now" through a dummy flow
// rather than a staff member recording an external transaction after the fact.
export const onlinePaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
});
export type OnlinePaymentInput = z.infer<typeof onlinePaymentSchema>;


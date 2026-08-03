import { z } from "zod";

// Payments are no longer a free-form amount: the payer picks which
// installment year they're paying for, and the amount is computed
// server-side from the student's fee (see /api/payments), not accepted from
// the client. This keeps a payment from ever being recorded for the wrong
// amount or for a year that doesn't exist for that student's degree length.
export const paymentCreateSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  installmentYear: z.number().int().positive("Select a year"),
  paidAt: z.coerce.date(),
});

// Omits studentId: correcting a mistaken year/date is supported (ordinary
// CRUD, not a full accounting ledger), but reassigning a payment to a
// different student isn't.
export const paymentUpdateSchema = paymentCreateSchema
  .omit({ studentId: true })
  .partial();

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;

// Simulated online payment: a student picks the year they're paying for, no
// reference number or date fields, since it's "paid right now" through a
// dummy flow rather than a staff member recording an external transaction
// after the fact.
export const onlinePaymentSchema = z.object({
  installmentYear: z.number().int().positive("Select a year"),
});
export type OnlinePaymentInput = z.infer<typeof onlinePaymentSchema>;

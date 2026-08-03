import type { Payment, Programme, Student } from "@/generated/prisma/client";

export type StudentBalanceInfo = {
  feeAmount: number;
  totalPaid: number;
  balance: number;
  isOverdue: boolean;
};

// Computed at read time, never stored, same principle applied to every other
// derived field in this app (late submissions, grade classification, age).
export function calculateStudentBalance(
  student: Pick<Student, "feeOverride">,
  programme: Pick<Programme, "feeAmount" | "feeDueDate">,
  payments: Pick<Payment, "amount">[]
): StudentBalanceInfo {
  const feeAmount = Number(student.feeOverride ?? programme.feeAmount);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balance = feeAmount - totalPaid;

  const isOverdue =
    balance > 0 &&
    programme.feeDueDate !== null &&
    new Date() > new Date(programme.feeDueDate);

  return { feeAmount, totalPaid, balance, isOverdue };
}

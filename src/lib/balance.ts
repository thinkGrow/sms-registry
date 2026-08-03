import type { DegreeLevel, Payment, Programme, Student } from "@/generated/prisma/client";

export type StudentBalanceInfo = {
  feeAmount: number;
  totalPaid: number;
  balance: number;
  isOverdue: boolean;
  installmentAmount: number;
  totalInstallments: number;
  installmentsDueByNow: number;
  amountOwedByNow: number;
};

// One installment per year of study: a 4-year Bachelor's splits the fee into
// 4, a 2-year Master's into 2.
export const TOTAL_INSTALLMENTS: Record<DegreeLevel, number> = {
  BACHELORS: 4,
  MASTERS: 2,
};

export type YearlyFeeBreakdown = {
  year: number;
  amount: number;
  cumulativeAmount: number;
};

// The programme-level, student-independent version of the same even split
// used in calculateStudentBalance: how much is due each year of study, and
// the running total by that year. Any individual student's actual schedule
// is still anchored to their own enrolmentDate and may use feeOverride
// instead of programme.feeAmount, this is just the standard breakdown for
// the programme itself.
export function getYearlyFeeBreakdown(
  programme: Pick<Programme, "feeAmount" | "degreeLevel">
): YearlyFeeBreakdown[] {
  const totalInstallments = TOTAL_INSTALLMENTS[programme.degreeLevel];
  const feeAmount = Number(programme.feeAmount);
  const installmentAmount = feeAmount / totalInstallments;

  return Array.from({ length: totalInstallments }, (_, i) => {
    const year = i + 1;
    return {
      year,
      amount: installmentAmount,
      cumulativeAmount: installmentAmount * year,
    };
  });
}

// Full years elapsed between two dates, anniversary-aware (not just a
// calendar-year subtraction, which would over-count e.g. Dec 2025 -> Jan 2026
// as a full year when barely a month has actually passed).
function fullYearsElapsed(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear();
  const anniversaryThisYear = new Date(to.getFullYear(), from.getMonth(), from.getDate());
  if (to < anniversaryThisYear) years -= 1;
  return Math.max(0, years);
}

// A student's fee override replaces the programme's standard fee entirely
// (never both), so this is the one place that decision is made.
export function getStudentFeeAmount(
  student: Pick<Student, "feeOverride">,
  programme: Pick<Programme, "feeAmount">
): number {
  return Number(student.feeOverride ?? programme.feeAmount);
}

// Computed at read time, never stored, same principle applied to every other
// derived field in this app (late submissions, grade classification, age).
//
// Each student has their own installment schedule anchored to their own
// enrolmentDate (not a single shared programme due date), since two students
// in the same programme can have started at completely different times.
// Installment 1 is due at enrolment; each subsequent one, one full year later.
export function calculateStudentBalance(
  student: Pick<Student, "feeOverride" | "enrolmentDate">,
  programme: Pick<Programme, "feeAmount" | "feeDueDate" | "degreeLevel">,
  payments: Pick<Payment, "amount">[]
): StudentBalanceInfo {
  const feeAmount = getStudentFeeAmount(student, programme);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balance = feeAmount - totalPaid;

  const totalInstallments = TOTAL_INSTALLMENTS[programme.degreeLevel];
  const installmentAmount = feeAmount / totalInstallments;

  const yearsElapsed = fullYearsElapsed(new Date(student.enrolmentDate), new Date());
  const installmentsDueByNow = Math.min(yearsElapsed + 1, totalInstallments);
  const amountOwedByNow = installmentAmount * installmentsDueByNow - totalPaid;

  const isOverdue = programme.feeDueDate !== null && amountOwedByNow > 0;

  return {
    feeAmount,
    totalPaid,
    balance,
    isOverdue,
    installmentAmount,
    totalInstallments,
    installmentsDueByNow,
    amountOwedByNow,
  };
}

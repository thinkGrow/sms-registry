import type {
  DegreeLevel,
  EnrolmentStatus,
  Payment,
  Programme,
  Student,
} from "@/generated/prisma/client";

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

// A deferral doesn't take effect the day staff sets it, it takes effect on
// the 1st of January the following year, matching how the institution
// actually processes deferrals (at year boundaries, not ad hoc).
export function deferralEffectiveDate(deferredAt: Date): Date {
  return new Date(deferredAt.getFullYear() + 1, 0, 1);
}

// When a deferral's one year of grace runs out (one year after its own
// effective date). Used to decide whether a *previous* deferral has fully
// resolved by the time a new one starts, so its year can be banked rather
// than silently lost, see deferredYearsBanked on Student.
export function deferralGraceEndDate(deferredAt: Date): Date {
  return deferralEffectiveDate(deferralEffectiveDate(deferredAt));
}

// Same next-Jan-1 effective-date rule as a deferral, but withdrawal is
// permanent, not a one year pause: the student owes whatever was due
// through the end of the year they withdrew in, and nothing further ever
// accrues after that.
export function withdrawalEffectiveDate(withdrawnAt: Date): Date {
  return new Date(withdrawnAt.getFullYear() + 1, 0, 1);
}

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// How many full years count toward the installment schedule, accounting for
// a deferral or a withdrawal (mutually exclusive by definition, since a
// student's current status can only be one or the other, but if a student
// was deferred in the past and later withdrew, withdrawal wins, it's the
// more final of the two events).
//
// Deferral has three phases:
//  1. Before it's taken effect (still before next Jan 1): billed exactly as
//     if not deferred at all, nothing changes yet.
//  2. From the effective date, for one assumed year: frozen at whatever was
//     already due the moment it took effect. This is what stops a deferral
//     from retroactively un-billing a year the student had already started,
//     it only ever holds the next not-yet-reached year back, never the
//     current one.
//  3. Once that one year of grace has passed: counting resumes normally from
//     the frozen point, permanently shifting the whole schedule out by a
//     year rather than catching back up on its own.
//
// Withdrawal only has the first two phases, there's no third: once its
// effective date arrives, the freeze is permanent.
//
// deferredYearsBanked adds on top of whatever the current/most recent
// deferral alone would produce: each of a student's past deferrals that had
// already fully resolved before the next one started contributes a
// permanent extra year, since a fresh effective-date calculation for a new
// deferral has no way to know a year was previously frozen by an earlier
// one. Students can't have two deferrals overlapping (staff must set status
// back to ENROLLED before a new one can start), so this only ever needs to
// add whole years, never a partial one.
//
// Exported for direct unit testing (see balance.test.ts): it's the single
// most complex, previously-buggy piece of logic in the app, and testing it
// directly is far clearer than reverse-engineering it through
// calculateStudentBalance, which adds unrelated fee/cap noise.
export function yearsElapsedForBilling(
  enrolmentDate: Date,
  now: Date,
  deferredAt: Date | null,
  deferredYearsBanked: number,
  withdrawnAt: Date | null
): number {
  const rawYearsElapsed = fullYearsElapsed(enrolmentDate, now);

  if (withdrawnAt !== null) {
    const effectiveDate = withdrawalEffectiveDate(withdrawnAt);
    if (now < effectiveDate) return rawYearsElapsed;
    return fullYearsElapsed(enrolmentDate, effectiveDate);
  }

  let years: number;
  if (deferredAt !== null) {
    const effectiveDate = deferralEffectiveDate(deferredAt);
    if (now < effectiveDate) {
      years = rawYearsElapsed;
    } else {
      const yearsElapsedAtEffectiveDate = fullYearsElapsed(enrolmentDate, effectiveDate);
      const yearsSinceEffective = fullYearsElapsed(effectiveDate, now);
      const extraYears = Math.max(0, yearsSinceEffective - 1);
      years = yearsElapsedAtEffectiveDate + extraYears;
    }
  } else {
    years = rawYearsElapsed;
  }

  return Math.max(0, years - deferredYearsBanked);
}

// Human-readable summary of where a student's deferral stands, for display
// next to their fee schedule. Returns null when they've never deferred.
// Shown as the full frozen year (1 Jan - 31 Dec of the effective year)
// rather than just the start date, since that's the actual window the
// schedule is held for, not a single point in time.
export function describeDeferral(deferredAt: Date | null): string | null {
  if (deferredAt === null) return null;

  const effectiveDate = deferralEffectiveDate(deferredAt);
  const rangeEnd = new Date(effectiveDate.getFullYear(), 11, 31);
  const range = `${formatDate(effectiveDate)} - ${formatDate(rangeEnd)}`;

  return new Date() < effectiveDate ? `Deferral scheduled: ${range}` : `Deferred: ${range}`;
}

// Same idea as describeDeferral, but a single date rather than a range,
// since withdrawal has no "end" to freeze within, it's permanent from the
// effective date onward.
export function describeWithdrawal(withdrawnAt: Date | null): string | null {
  if (withdrawnAt === null) return null;

  const effectiveDate = withdrawalEffectiveDate(withdrawnAt);
  const label = formatDate(effectiveDate);

  return new Date() < effectiveDate
    ? `Withdrawal scheduled, effective from ${label}`
    : `Withdraw effective from ${label}`;
}

// This app has no scheduler, nothing runs code when a calendar date arrives
// on its own, so the stored status field would otherwise stay stuck on
// DEFERRED forever once a deferral's year of grace ends, until staff
// happens to notice and manually set it back. Instead of storing that
// change, it's computed here at read time, the same principle as every
// other derived value in this app, so the student is correctly treated as
// ENROLLED again (badge, submission eligibility) the moment grace runs out,
// without writing anything or needing a background job. WITHDRAWN never
// auto-reverts, that one's permanent by definition.
export function effectiveStatus(
  status: EnrolmentStatus,
  deferredAt: Date | null
): EnrolmentStatus {
  if (status === "DEFERRED" && deferredAt !== null && new Date() >= deferralGraceEndDate(deferredAt)) {
    return "ENROLLED";
  }
  return status;
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
//
// See yearsElapsedForBilling above for what a deferral actually does to the
// schedule: nothing until the next Jan 1, then frozen for a year, then
// resumes, permanently pushing out the final payment date (a Bachelor's
// student who defers once winds up on a 5-year schedule instead of 4)
// rather than just a temporary pause that catches back up on its own.
export function calculateStudentBalance(
  student: Pick<
    Student,
    "feeOverride" | "enrolmentDate" | "deferredAt" | "deferredYearsBanked" | "withdrawnAt"
  >,
  programme: Pick<Programme, "feeAmount" | "feeDueDate" | "degreeLevel">,
  payments: Pick<Payment, "amount">[]
): StudentBalanceInfo {
  const feeAmount = getStudentFeeAmount(student, programme);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balance = feeAmount - totalPaid;

  const totalInstallments = TOTAL_INSTALLMENTS[programme.degreeLevel];
  const installmentAmount = feeAmount / totalInstallments;

  const yearsElapsed = yearsElapsedForBilling(
    new Date(student.enrolmentDate),
    new Date(),
    student.deferredAt ? new Date(student.deferredAt) : null,
    student.deferredYearsBanked,
    student.withdrawnAt ? new Date(student.withdrawnAt) : null
  );
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

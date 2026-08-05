import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  yearsElapsedForBilling,
  deferralEffectiveDate,
  deferralGraceEndDate,
  withdrawalEffectiveDate,
  effectiveStatus,
  getStudentFeeAmount,
  getYearlyFeeBreakdown,
  calculateStudentBalance,
} from "./balance";

// yearsElapsedForBilling, effectiveStatus, deferralEffectiveDate etc. all
// read `new Date()` internally rather than taking "now" as an injected
// dependency (see balance.ts), so every test pins the system clock rather
// than passing a "now" of its own.
function setNow(iso: string) {
  vi.setSystemTime(new Date(iso));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("deferralEffectiveDate / deferralGraceEndDate / withdrawalEffectiveDate", () => {
  it("takes effect on the 1st of January the following year", () => {
    expect(deferralEffectiveDate(new Date("2025-06-01"))).toEqual(new Date(2026, 0, 1));
    expect(withdrawalEffectiveDate(new Date("2025-06-01"))).toEqual(new Date(2026, 0, 1));
  });

  it("grace ends one year after the effective date", () => {
    expect(deferralGraceEndDate(new Date("2025-06-01"))).toEqual(new Date(2027, 0, 1));
  });
});

describe("yearsElapsedForBilling: no deferral or withdrawal", () => {
  it("counts zero years on the enrolment date itself", () => {
    setNow("2024-01-01");
    expect(yearsElapsedForBilling(new Date("2024-01-01"), new Date(), null, 0, null)).toBe(0);
  });

  it("doesn't credit a year until the anniversary date arrives", () => {
    setNow("2025-06-14");
    expect(yearsElapsedForBilling(new Date("2024-06-15"), new Date(), null, 0, null)).toBe(0);

    setNow("2025-06-15");
    expect(yearsElapsedForBilling(new Date("2024-06-15"), new Date(), null, 0, null)).toBe(1);
  });
});

describe("yearsElapsedForBilling: deferral's three phases", () => {
  const enrolmentDate = new Date("2024-01-01");
  const deferredAt = new Date("2025-06-01"); // effective 2026-01-01, grace ends 2027-01-01

  it("phase 1: billed exactly as if not deferred, before the effective date", () => {
    setNow("2025-12-01");
    const deferred = yearsElapsedForBilling(enrolmentDate, new Date(), deferredAt, 0, null);
    const notDeferred = yearsElapsedForBilling(enrolmentDate, new Date(), null, 0, null);
    expect(deferred).toBe(notDeferred);
  });

  it("phase 2: frozen at whatever was due the moment it took effect, for the whole grace year", () => {
    setNow("2026-06-01");
    expect(yearsElapsedForBilling(enrolmentDate, new Date(), deferredAt, 0, null)).toBe(2);

    setNow("2026-12-31");
    expect(yearsElapsedForBilling(enrolmentDate, new Date(), deferredAt, 0, null)).toBe(2);
  });

  it("phase 3: resumes after grace ends, permanently shifting the schedule by a year", () => {
    setNow("2028-01-01");
    const deferred = yearsElapsedForBilling(enrolmentDate, new Date(), deferredAt, 0, null);
    const notDeferred = yearsElapsedForBilling(enrolmentDate, new Date(), null, 0, null);
    // Same student, same "now": the deferral should leave them exactly one
    // year behind where they'd otherwise be, not caught back up.
    expect(deferred).toBe(notDeferred - 1);
  });

  it("never drops the count below what was already due at the moment deferral was set (the original bug)", () => {
    // Enrolled long enough that, by the time deferredAt is set, 3
    // installments are already accruing. The old flat "-1 year" model
    // dropped this immediately; the fixed model must not, right up until
    // the effective date arrives.
    const longEnrolled = new Date("2022-01-01");
    setNow("2025-06-01"); // the moment deferredAt is set below
    const atDeferralTime = yearsElapsedForBilling(longEnrolled, new Date(), null, 0, null);

    setNow("2025-12-31"); // still before the next Jan 1, deferral not yet effective
    const stillBeforeEffective = yearsElapsedForBilling(
      longEnrolled,
      new Date(),
      new Date("2025-06-01"),
      0,
      null
    );

    expect(stillBeforeEffective).toBeGreaterThanOrEqual(atDeferralTime);
  });
});

describe("yearsElapsedForBilling: deferredYearsBanked compounds a second deferral", () => {
  it("subtracts previously-banked years on top of the current deferral's own math", () => {
    const enrolmentDate = new Date("2024-01-01");
    const deferredAt = new Date("2025-06-01");
    setNow("2028-01-01");

    const withoutBanking = yearsElapsedForBilling(enrolmentDate, new Date(), deferredAt, 0, null);
    const withOneBanked = yearsElapsedForBilling(enrolmentDate, new Date(), deferredAt, 1, null);
    expect(withOneBanked).toBe(withoutBanking - 1);
  });

  it("never goes negative even if banked years exceed the raw count", () => {
    setNow("2024-06-01");
    expect(
      yearsElapsedForBilling(new Date("2024-01-01"), new Date(), null, 5, null)
    ).toBe(0);
  });
});

describe("yearsElapsedForBilling: withdrawal has no third phase", () => {
  const enrolmentDate = new Date("2024-01-01");
  const withdrawnAt = new Date("2025-06-01"); // effective 2026-01-01

  it("bills normally before the effective date", () => {
    setNow("2025-12-01");
    const withdrawn = yearsElapsedForBilling(enrolmentDate, new Date(), null, 0, withdrawnAt);
    const active = yearsElapsedForBilling(enrolmentDate, new Date(), null, 0, null);
    expect(withdrawn).toBe(active);
  });

  it("freezes permanently at the effective date, never resuming", () => {
    setNow("2026-03-01");
    const soonAfter = yearsElapsedForBilling(enrolmentDate, new Date(), null, 0, withdrawnAt);

    setNow("2030-03-01");
    const yearsLater = yearsElapsedForBilling(enrolmentDate, new Date(), null, 0, withdrawnAt);

    expect(soonAfter).toBe(yearsLater);
  });
});

describe("effectiveStatus", () => {
  it("auto-reverts DEFERRED to ENROLLED once the grace year ends", () => {
    const deferredAt = new Date("2025-06-01"); // grace ends 2027-01-01

    setNow("2026-06-01");
    expect(effectiveStatus("DEFERRED", deferredAt)).toBe("DEFERRED");

    setNow("2027-01-01");
    expect(effectiveStatus("DEFERRED", deferredAt)).toBe("ENROLLED");
  });

  it("never auto-reverts WITHDRAWN", () => {
    setNow("2099-01-01");
    expect(effectiveStatus("WITHDRAWN", null)).toBe("WITHDRAWN");
  });

  it("leaves ENROLLED and COMPLETED unchanged", () => {
    setNow("2026-01-01");
    expect(effectiveStatus("ENROLLED", null)).toBe("ENROLLED");
    expect(effectiveStatus("COMPLETED", null)).toBe("COMPLETED");
  });
});

describe("getStudentFeeAmount", () => {
  it("uses the programme fee when there's no override", () => {
    expect(
      getStudentFeeAmount({ feeOverride: null }, { feeAmount: 5000 as unknown as never })
    ).toBe(5000);
  });

  it("replaces the programme fee entirely when overridden", () => {
    expect(
      getStudentFeeAmount(
        { feeOverride: 3000 as unknown as never },
        { feeAmount: 5000 as unknown as never }
      )
    ).toBe(3000);
  });
});

describe("getYearlyFeeBreakdown", () => {
  it("splits a Bachelor's fee evenly across 4 years with a running total", () => {
    const breakdown = getYearlyFeeBreakdown({
      feeAmount: 4000 as unknown as never,
      degreeLevel: "BACHELORS",
    });
    expect(breakdown).toEqual([
      { year: 1, amount: 1000, cumulativeAmount: 1000 },
      { year: 2, amount: 1000, cumulativeAmount: 2000 },
      { year: 3, amount: 1000, cumulativeAmount: 3000 },
      { year: 4, amount: 1000, cumulativeAmount: 4000 },
    ]);
  });

  it("splits a Master's fee evenly across 2 years", () => {
    const breakdown = getYearlyFeeBreakdown({
      feeAmount: 6000 as unknown as never,
      degreeLevel: "MASTERS",
    });
    expect(breakdown).toEqual([
      { year: 1, amount: 3000, cumulativeAmount: 3000 },
      { year: 2, amount: 3000, cumulativeAmount: 6000 },
    ]);
  });
});

describe("calculateStudentBalance", () => {
  const bachelorsProgramme = {
    feeAmount: 4000 as unknown as never,
    feeDueDate: new Date("2024-01-01") as unknown as never,
    degreeLevel: "BACHELORS" as const,
  };

  it("owes exactly the first installment on the day of enrolment", () => {
    setNow("2024-01-01");
    const result = calculateStudentBalance(
      {
        feeOverride: null,
        enrolmentDate: new Date("2024-01-01") as unknown as never,
        deferredAt: null,
        deferredYearsBanked: 0,
        withdrawnAt: null,
      },
      bachelorsProgramme,
      []
    );
    expect(result.installmentsDueByNow).toBe(1);
    expect(result.amountOwedByNow).toBe(1000);
    expect(result.isOverdue).toBe(true);
  });

  it("isn't overdue once the amount due so far is fully paid", () => {
    setNow("2024-01-01");
    const result = calculateStudentBalance(
      {
        feeOverride: null,
        enrolmentDate: new Date("2024-01-01") as unknown as never,
        deferredAt: null,
        deferredYearsBanked: 0,
        withdrawnAt: null,
      },
      bachelorsProgramme,
      [{ amount: 1000 as unknown as never }]
    );
    expect(result.amountOwedByNow).toBe(0);
    expect(result.isOverdue).toBe(false);
    // Paid in full for the year, but the programme fee overall isn't fully
    // paid off yet, those are deliberately different numbers.
    expect(result.balance).toBe(3000);
  });

  it("is never overdue when the programme has no fee due date at all", () => {
    setNow("2030-01-01"); // long enough that installments would otherwise be overdue
    const result = calculateStudentBalance(
      {
        feeOverride: null,
        enrolmentDate: new Date("2024-01-01") as unknown as never,
        deferredAt: null,
        deferredYearsBanked: 0,
        withdrawnAt: null,
      },
      { ...bachelorsProgramme, feeDueDate: null },
      []
    );
    expect(result.isOverdue).toBe(false);
  });

  it("caps installments due at the programme's total, however long ago enrolment was", () => {
    setNow("2040-01-01");
    const result = calculateStudentBalance(
      {
        feeOverride: null,
        enrolmentDate: new Date("2024-01-01") as unknown as never,
        deferredAt: null,
        deferredYearsBanked: 0,
        withdrawnAt: null,
      },
      bachelorsProgramme,
      []
    );
    expect(result.installmentsDueByNow).toBe(4);
    expect(result.amountOwedByNow).toBe(4000);
  });

  it("reflects a fee override instead of the programme's standard fee", () => {
    setNow("2024-01-01");
    const result = calculateStudentBalance(
      {
        feeOverride: 2000 as unknown as never,
        enrolmentDate: new Date("2024-01-01") as unknown as never,
        deferredAt: null,
        deferredYearsBanked: 0,
        withdrawnAt: null,
      },
      bachelorsProgramme,
      []
    );
    expect(result.feeAmount).toBe(2000);
    expect(result.installmentAmount).toBe(500);
    expect(result.amountOwedByNow).toBe(500);
  });
});

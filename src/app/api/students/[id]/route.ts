import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { studentUpdateSchema } from "@/lib/validations/student";
import {
  TOTAL_INSTALLMENTS,
  deferralEffectiveDate,
  deferralGraceEndDate,
  withdrawalEffectiveDate,
} from "@/lib/balance";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: { programme: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json(student);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = studentUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const needsExisting =
    parsed.data.status !== undefined ||
    parsed.data.academicYear !== undefined ||
    parsed.data.programmeId !== undefined;
  const existing = needsExisting
    ? await prisma.student.findUnique({
        where: { id },
        select: {
          status: true,
          programmeId: true,
          academicYear: true,
          deferredAt: true,
          deferredYearsBanked: true,
          withdrawnAt: true,
        },
      })
    : null;
  if (needsExisting && existing === null) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // A deferral doesn't take effect immediately, it's scheduled for next Jan
  // 1 (see balance.ts), so this only fires when status is actually
  // transitioning into DEFERRED from something else, not on every unrelated
  // PATCH to a student who's already deferred (which would reset the date).
  const justDeferred =
    parsed.data.status === "DEFERRED" &&
    existing !== null &&
    existing.status !== "DEFERRED";

  // If staff reverses a deferral before it's actually taken effect (still
  // before next Jan 1), it's a full cancel, nothing ever happened to the fee
  // schedule. Once the effective date has passed, the shift already applied
  // and stays permanent even if the student comes back off DEFERRED, so
  // deferredAt is left alone in that case.
  const cancelingUneffectiveDeferral =
    existing !== null &&
    existing.status === "DEFERRED" &&
    existing.deferredAt !== null &&
    parsed.data.status !== undefined &&
    parsed.data.status !== "DEFERRED" &&
    new Date() < deferralEffectiveDate(existing.deferredAt);

  // Students can't have two deferrals overlapping, staff must set status
  // back to ENROLLED before a new one can start, so if this new deferral
  // follows an earlier one that had already fully run its year of grace,
  // that year needs to be permanently banked before deferredAt is
  // overwritten, otherwise the new deferral's fresh effective-date math has
  // no way to know a year was already frozen, and would silently erase it.
  const bankingPriorDeferral =
    justDeferred &&
    existing !== null &&
    existing.deferredAt !== null &&
    new Date() >= deferralGraceEndDate(existing.deferredAt);

  // Same effective-date rule as a deferral, but withdrawal has no third
  // "resumes counting" phase, so reversing it after the effective date has
  // passed just leaves the permanent freeze in place, same as a deferral.
  const justWithdrawn =
    parsed.data.status === "WITHDRAWN" &&
    existing !== null &&
    existing.status !== "WITHDRAWN";

  const cancelingUneffectiveWithdrawal =
    existing !== null &&
    existing.status === "WITHDRAWN" &&
    existing.withdrawnAt !== null &&
    parsed.data.status !== undefined &&
    parsed.data.status !== "WITHDRAWN" &&
    new Date() < withdrawalEffectiveDate(existing.withdrawnAt);

  // Academic year is capped by whichever programme applies after this
  // update, its current one if programmeId isn't changing, checked whenever
  // either field is part of the update.
  if (parsed.data.academicYear !== undefined || parsed.data.programmeId !== undefined) {
    const effectiveProgrammeId = parsed.data.programmeId ?? existing!.programmeId;
    const effectiveAcademicYear = parsed.data.academicYear ?? existing!.academicYear;
    const programme = await prisma.programme.findUnique({
      where: { id: effectiveProgrammeId },
    });
    if (!programme) {
      return NextResponse.json({ error: "Programme not found" }, { status: 404 });
    }
    const maxAcademicYear = TOTAL_INSTALLMENTS[programme.degreeLevel];
    if (effectiveAcademicYear > maxAcademicYear) {
      return NextResponse.json(
        {
          error: `Academic year can't exceed ${maxAcademicYear} for this programme's degree length.`,
        },
        { status: 400 }
      );
    }
  }

  try {
    const student = await prisma.student.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(justDeferred && { deferredAt: new Date() }),
        ...(bankingPriorDeferral && { deferredYearsBanked: { increment: 1 } }),
        ...(cancelingUneffectiveDeferral && { deferredAt: null }),
        ...(justWithdrawn && { withdrawnAt: new Date() }),
        ...(cancelingUneffectiveWithdrawal && { withdrawnAt: null }),
      },
    });
    return NextResponse.json(student);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    throw error;
  }
}

// Genuine hard delete, for removing a mistaken entry (wrong student created,
// duplicate, typo), not for a real student leaving, that's what WITHDRAWN is
// for. Payment/Submission/Grade all have a required (non-cascading) relation
// to Student, so Postgres itself rejects deleting a student who has any of
// those on record (P2003), that's the actual safeguard, not a check written
// here, a student with real history can't be silently erased this way.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    await prisma.student.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }
      if (error.code === "P2003") {
        return NextResponse.json(
          {
            error:
              "Can't delete a student with payments, submissions, or grades on record. Set their status to Withdrawn instead.",
          },
          { status: 400 }
        );
      }
    }
    throw error;
  }
}

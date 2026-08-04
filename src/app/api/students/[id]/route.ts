import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { studentUpdateSchema } from "@/lib/validations/student";
import { TOTAL_INSTALLMENTS } from "@/lib/balance";

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
    parsed.data.status === "DEFERRED" ||
    parsed.data.academicYear !== undefined ||
    parsed.data.programmeId !== undefined;
  const existing = needsExisting
    ? await prisma.student.findUnique({
        where: { id },
        select: { status: true, programmeId: true, academicYear: true },
      })
    : null;
  if (needsExisting && existing === null) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // A deferral is assumed to be worth exactly one year added to the fee
  // schedule (see balance.ts), so this only fires when status is actually
  // transitioning into DEFERRED from something else, not on every unrelated
  // PATCH to a student who's already deferred (which would double-count).
  const justDeferred =
    parsed.data.status === "DEFERRED" &&
    existing !== null &&
    existing.status !== "DEFERRED";

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
        ...(justDeferred && { deferredYears: { increment: 1 } }),
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

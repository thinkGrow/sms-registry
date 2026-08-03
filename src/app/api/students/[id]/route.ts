import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { studentUpdateSchema } from "@/lib/validations/student";

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

  // A deferral is assumed to be worth exactly one year added to the fee
  // schedule (see balance.ts), so this only fires when status is actually
  // transitioning into DEFERRED from something else, not on every unrelated
  // PATCH to a student who's already deferred (which would double-count).
  let justDeferred = false;
  if (parsed.data.status === "DEFERRED") {
    const existing = await prisma.student.findUnique({
      where: { id },
      select: { status: true },
    });
    justDeferred = existing !== null && existing.status !== "DEFERRED";
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

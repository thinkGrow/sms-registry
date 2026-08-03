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

  try {
    const student = await prisma.student.update({
      where: { id },
      data: parsed.data,
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

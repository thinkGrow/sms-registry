import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { assessmentUpdateSchema } from "@/lib/validations/assessment";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      programme: true,
      submissions: { include: { student: true }, orderBy: { updatedAt: "desc" } },
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  return NextResponse.json(assessment);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = assessmentUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const assessment = await prisma.assessment.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(assessment);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }
    throw error;
  }
}

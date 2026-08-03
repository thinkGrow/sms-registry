import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { assessmentCreateSchema } from "@/lib/validations/assessment";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const programmeId = searchParams.get("programmeId");

  const assessments = await prisma.assessment.findMany({
    where: { ...(programmeId && { programmeId }) },
    include: { programme: true, submissions: true },
    orderBy: { deadline: "asc" },
  });

  return NextResponse.json(assessments);
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = assessmentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const assessment = await prisma.assessment.create({ data: parsed.data });
  return NextResponse.json(assessment, { status: 201 });
}

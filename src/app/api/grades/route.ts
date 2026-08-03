import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { gradeUpsertSchema } from "@/lib/validations/grade";

// One grade per student per assessment, so entering a grade is always an
// upsert: create it the first time, overwrite the score on later edits.
export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = gradeUpsertSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { studentId, assessmentId, score } = parsed.data;

  const grade = await prisma.grade.upsert({
    where: { studentId_assessmentId: { studentId, assessmentId } },
    create: { studentId, assessmentId, score },
    update: { score },
  });

  return NextResponse.json(grade, { status: 201 });
}

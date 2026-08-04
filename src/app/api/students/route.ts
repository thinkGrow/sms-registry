import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStudentId } from "@/lib/generate-student-id";
import { requireStaff } from "@/lib/api-auth";
import {
  studentCreateSchema,
  enrolmentStatusValues,
} from "@/lib/validations/student";
import { TOTAL_INSTALLMENTS } from "@/lib/balance";

// GET /api/students?search=&programmeId=&status=
// search matches against full name or student id (case-insensitive).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const programmeId = searchParams.get("programmeId");
  const status = searchParams.get("status");

  const isValidStatus = (
    value: string | null
  ): value is (typeof enrolmentStatusValues)[number] =>
    value !== null && (enrolmentStatusValues as readonly string[]).includes(value);

  const students = await prisma.student.findMany({
    where: {
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { studentId: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(programmeId && { programmeId }),
      ...(isValidStatus(status) && { status }),
    },
    include: { programme: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(students);
}

// POST /api/students
export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = studentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const programme = await prisma.programme.findUnique({
    where: { id: parsed.data.programmeId },
  });
  if (!programme) {
    return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  }
  const maxAcademicYear = TOTAL_INSTALLMENTS[programme.degreeLevel];
  if (parsed.data.academicYear > maxAcademicYear) {
    return NextResponse.json(
      {
        error: `Academic year can't exceed ${maxAcademicYear} for this programme's degree length.`,
      },
      { status: 400 }
    );
  }

  const studentId = await generateStudentId();

  try {
    const student = await prisma.student.create({
      data: { ...parsed.data, studentId },
    });
    return NextResponse.json(student, { status: 201 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A student with this email already exists" },
        { status: 409 }
      );
    }
    throw error;
  }
}

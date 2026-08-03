import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireSelf } from "@/lib/api-auth";
import {
  submissionCreateSchema,
  ACCEPTED_FILE_TYPES,
} from "@/lib/validations/submission";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const FILE_EXTENSIONS: Record<"PDF" | "DOCX", string> = {
  PDF: ".pdf",
  DOCX: ".docx",
};

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: assessmentId } = await params;

  const formData = await request.formData();
  const studentId = formData.get("studentId");
  const file = formData.get("file");

  const parsed = submissionCreateSchema.safeParse({ studentId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const auth = await requireSelf(parsed.data.studentId);
  if (!auth.ok) return auth.response;

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  const fileType = ACCEPTED_FILE_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json(
      { error: "Only PDF or DOCX files are accepted" },
      { status: 400 }
    );
  }

  const [assessment, student] = await Promise.all([
    prisma.assessment.findUnique({ where: { id: assessmentId } }),
    prisma.student.findUnique({ where: { id: parsed.data.studentId } }),
  ]);

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  if (student.status !== "ENROLLED") {
    const reason: Record<"DEFERRED" | "WITHDRAWN" | "COMPLETED", string> = {
      DEFERRED: "You've deferred your studies, so you can't submit assessment work until you resume.",
      WITHDRAWN: "You've withdrawn from your programme, so you can no longer submit assessment work.",
      COMPLETED: "You've completed your programme, so you can no longer submit assessment work.",
    };
    return NextResponse.json(
      { error: reason[student.status as "DEFERRED" | "WITHDRAWN" | "COMPLETED"] },
      { status: 403 }
    );
  }
  if (student.programmeId !== assessment.programmeId) {
    return NextResponse.json(
      { error: "This assessment isn't open to students outside its programme" },
      { status: 403 }
    );
  }

  const existingSubmission = await prisma.submission.findUnique({
    where: {
      studentId_assessmentId: { studentId: student.id, assessmentId },
    },
  });

  // Resubmission is only allowed before the deadline. A first-time
  // submission after the deadline is still accepted (and gets flagged late
  // at read time), but once something's been submitted, it's locked in
  // after the cutoff.
  if (existingSubmission && new Date() > new Date(assessment.deadline)) {
    return NextResponse.json(
      { error: "The deadline has passed; this submission can no longer be changed" },
      { status: 403 }
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedFileName = `${randomUUID()}${FILE_EXTENSIONS[fileType]}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedFileName), bytes);

  const submission = existingSubmission
    ? await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          fileUrl: `/uploads/${storedFileName}`,
          fileName: file.name,
          fileType,
        },
      })
    : await prisma.submission.create({
        data: {
          assessmentId,
          studentId: student.id,
          fileUrl: `/uploads/${storedFileName}`,
          fileName: file.name,
          fileType,
        },
      });

  // Clean up the old file on disk after a successful resubmission, so
  // replaced files don't accumulate indefinitely in the uploads folder.
  if (existingSubmission) {
    const oldFilePath = path.join(process.cwd(), "public", existingSubmission.fileUrl);
    await unlink(oldFilePath).catch(() => {});
  }

  return NextResponse.json(submission, { status: existingSubmission ? 200 : 201 });
}

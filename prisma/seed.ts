import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function main() {
  // Clear existing data (reverse dependency order) so this script is safe to re-run.
  await prisma.grade.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.programme.deleteMany();

  const cs = await prisma.programme.create({
    data: {
      name: "BSc Computer Science",
      feeAmount: 5000,
      degreeLevel: "BACHELORS",
      feeDueDate: new Date("2026-07-01"),
    },
  });

  const business = await prisma.programme.create({
    data: {
      name: "BA Business Administration",
      feeAmount: 4000,
      degreeLevel: "BACHELORS",
      feeDueDate: new Date("2026-07-01"),
    },
  });

  // No fee due date at all: demonstrates that a programme without one never
  // flags its students as overdue, regardless of outstanding balance.
  const dataScience = await prisma.programme.create({
    data: {
      name: "MSc Data Science",
      feeAmount: 6000,
      degreeLevel: "MASTERS",
      feeDueDate: null,
    },
  });

  const alice = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0001",
      fullName: "Alice Johnson",
      email: "alice.johnson@example.com",
      dateOfBirth: new Date("2003-04-12"),
      enrolmentDate: new Date("2025-09-15"),
      programmeId: cs.id,
      academicYear: 1,
      status: "ENROLLED",
    },
  });

  // Partial payment: 2 years in, so 2 installments (of 4) are due by now, and
  // only enough has been paid to cover a bit less than one, appears overdue.
  const brian = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0002",
      fullName: "Brian Smith",
      email: "brian.smith@example.com",
      dateOfBirth: new Date("2002-11-05"),
      enrolmentDate: new Date("2024-09-15"),
      programmeId: cs.id,
      academicYear: 2,
      status: "ENROLLED",
    },
  });

  // No payments at all: overdue.
  const carla = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0003",
      fullName: "Carla Davis",
      email: "carla.davis@example.com",
      dateOfBirth: new Date("2004-02-20"),
      enrolmentDate: new Date("2025-09-15"),
      programmeId: business.id,
      academicYear: 1,
      status: "ENROLLED",
    },
  });

  // Deferred, unpaid, 3 years in: 3 of 4 installments due, all unpaid, overdue.
  const david = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0004",
      fullName: "David Lee",
      email: "david.lee@example.com",
      dateOfBirth: new Date("2001-08-30"),
      enrolmentDate: new Date("2023-09-15"),
      programmeId: business.id,
      academicYear: 3,
      status: "DEFERRED",
    },
  });

  // Withdrawn, with a partial payment on record before they left.
  const emma = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0005",
      fullName: "Emma Wilson",
      email: "emma.wilson@example.com",
      dateOfBirth: new Date("2003-06-15"),
      enrolmentDate: new Date("2025-09-15"),
      programmeId: cs.id,
      academicYear: 1,
      status: "WITHDRAWN",
    },
  });

  const farid = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0006",
      fullName: "Farid Khan",
      email: "farid.khan@example.com",
      dateOfBirth: new Date("2000-01-10"),
      enrolmentDate: new Date("2024-09-15"),
      programmeId: business.id,
      academicYear: 2,
      status: "COMPLETED",
    },
  });

  // Fee override: pays a reduced, scholarship rate instead of the programme default.
  const grace = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0007",
      fullName: "Grace Chen",
      email: "grace.chen@example.com",
      dateOfBirth: new Date("2002-09-25"),
      enrolmentDate: new Date("2023-09-15"),
      programmeId: cs.id,
      academicYear: 3,
      status: "ENROLLED",
      feeOverride: 3000,
    },
  });

  // Unpaid, but NOT overdue: their programme (MSc Data Science) has no fee due date set.
  const henry = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0008",
      fullName: "Henry Osei",
      email: "henry.osei@example.com",
      dateOfBirth: new Date("2001-03-02"),
      enrolmentDate: new Date("2025-09-15"),
      programmeId: dataScience.id,
      academicYear: 1,
      status: "ENROLLED",
    },
  });

  // Pays in two installments rather than a single lump sum; paid enough to
  // cover both installments due so far (2 years in), so not overdue despite
  // not having paid the full programme fee yet.
  const isla = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0009",
      fullName: "Isla Thompson",
      email: "isla.thompson@example.com",
      dateOfBirth: new Date("2003-10-08"),
      enrolmentDate: new Date("2024-09-15"),
      programmeId: cs.id,
      academicYear: 2,
      status: "ENROLLED",
    },
  });

  // Final-year student (edge case for academicYear), fully paid.
  const jamal = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0010",
      fullName: "Jamal Bakr",
      email: "jamal.bakr@example.com",
      dateOfBirth: new Date("2000-12-19"),
      enrolmentDate: new Date("2022-09-15"),
      programmeId: business.id,
      academicYear: 4,
      status: "ENROLLED",
    },
  });

  // Deferred with a partial payment, also not overdue (no due date on this programme).
  const fatima = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0011",
      fullName: "Fatima Noor",
      email: "fatima.noor@example.com",
      dateOfBirth: new Date("2002-07-14"),
      enrolmentDate: new Date("2025-09-15"),
      programmeId: dataScience.id,
      academicYear: 1,
      status: "DEFERRED",
    },
  });

  const liam = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0012",
      fullName: "Liam O'Connor",
      email: "liam.oconnor@example.com",
      dateOfBirth: new Date("2002-05-27"),
      enrolmentDate: new Date("2023-09-15"),
      programmeId: cs.id,
      academicYear: 3,
      status: "ENROLLED",
    },
  });

  // Withdrawn with zero payments ever made (vs. Emma's partial-then-withdrew).
  const sofia = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0013",
      fullName: "Sofia Martinez",
      email: "sofia.martinez@example.com",
      dateOfBirth: new Date("2003-01-30"),
      enrolmentDate: new Date("2024-09-15"),
      programmeId: business.id,
      academicYear: 2,
      status: "WITHDRAWN",
    },
  });

  const noah = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0014",
      fullName: "Noah Kim",
      email: "noah.kim@example.com",
      dateOfBirth: new Date("2000-09-11"),
      enrolmentDate: new Date("2024-09-15"),
      programmeId: dataScience.id,
      academicYear: 2,
      status: "COMPLETED",
    },
  });

  await prisma.payment.createMany({
    data: [
      { referenceNumber: "PMT-2026-000001", studentId: alice.id, amount: 5000, paidAt: new Date("2026-06-15") },
      { referenceNumber: "PMT-2026-000002", studentId: brian.id, amount: 2000, paidAt: new Date("2026-06-20") },
      { referenceNumber: "PMT-2026-000003", studentId: emma.id, amount: 1000, paidAt: new Date("2026-06-10") },
      { referenceNumber: "PMT-2026-000004", studentId: farid.id, amount: 4000, paidAt: new Date("2026-06-01") },
      { referenceNumber: "PMT-2026-000005", studentId: grace.id, amount: 3000, paidAt: new Date("2026-06-18") },
      // Isla pays in two installments rather than one lump sum.
      { referenceNumber: "PMT-2026-000006", studentId: isla.id, amount: 2000, paidAt: new Date("2026-06-05") },
      { referenceNumber: "PMT-2026-000007", studentId: isla.id, amount: 1500, paidAt: new Date("2026-06-25") },
      { referenceNumber: "PMT-2026-000008", studentId: jamal.id, amount: 4000, paidAt: new Date("2026-06-12") },
      { referenceNumber: "PMT-2026-000009", studentId: fatima.id, amount: 2000, paidAt: new Date("2026-06-08") },
      { referenceNumber: "PMT-2026-000010", studentId: liam.id, amount: 5000, paidAt: new Date("2026-06-22") },
      { referenceNumber: "PMT-2026-000011", studentId: noah.id, amount: 6000, paidAt: new Date("2026-05-20") },
    ],
  });

  const dataStructuresAssignment = await prisma.assessment.create({
    data: {
      title: "Data Structures Assignment 1",
      module: "Data Structures",
      programmeId: cs.id,
      deadline: new Date("2026-07-20T23:59:00Z"),
    },
  });

  const algorithmsMidterm = await prisma.assessment.create({
    data: {
      title: "Algorithms Midterm",
      module: "Algorithms",
      programmeId: cs.id,
      deadline: new Date("2026-07-25T23:59:00Z"),
    },
  });

  // Deadline in the future: still open for submissions.
  const businessEthicsEssay = await prisma.assessment.create({
    data: {
      title: "Business Ethics Essay",
      module: "Business Ethics",
      programmeId: business.id,
      deadline: new Date("2026-08-15T23:59:00Z"),
    },
  });

  // Past deadline but deliberately left with zero submissions, demonstrates
  // the "no submissions yet" empty state rather than every assessment having data.
  const marketingQuiz = await prisma.assessment.create({
    data: {
      title: "Marketing Fundamentals Quiz",
      module: "Marketing Fundamentals",
      programmeId: business.id,
      deadline: new Date("2026-07-10T23:59:00Z"),
    },
  });

  const machineLearningFundamentals = await prisma.assessment.create({
    data: {
      title: "Machine Learning Fundamentals",
      module: "Machine Learning",
      programmeId: dataScience.id,
      deadline: new Date("2026-08-20T23:59:00Z"),
    },
  });

  // Individual creates (not createMany) so each submission's updatedAt can be
  // explicitly backdated to its intended illustrative date. Without this,
  // every row defaults to "now", which is after every past deadline below,
  // and the "late" flag (computed from updatedAt vs. assessment.deadline)
  // would incorrectly mark everything late rather than just the intended examples.
  const submissionSeeds = [
    // Data Structures Assignment 1 (deadline 2026-07-20).
    { assessmentId: dataStructuresAssignment.id, studentId: alice.id, fileUrl: "/uploads/alice-ds-assignment1.pdf", fileName: "alice-ds-assignment1.pdf", fileType: "PDF" as const, submittedAt: "2026-07-18T14:00:00Z" },
    // Late: submitted after the deadline.
    { assessmentId: dataStructuresAssignment.id, studentId: brian.id, fileUrl: "/uploads/brian-ds-assignment1.docx", fileName: "brian-ds-assignment1.docx", fileType: "DOCX" as const, submittedAt: "2026-07-22T10:00:00Z" },
    { assessmentId: dataStructuresAssignment.id, studentId: grace.id, fileUrl: "/uploads/grace-ds-assignment1.pdf", fileName: "grace-ds-assignment1.pdf", fileType: "PDF" as const, submittedAt: "2026-07-19T09:00:00Z" },
    { assessmentId: dataStructuresAssignment.id, studentId: isla.id, fileUrl: "/uploads/isla-ds-assignment1.pdf", fileName: "isla-ds-assignment1.pdf", fileType: "PDF" as const, submittedAt: "2026-07-17T12:00:00Z" },
    { assessmentId: dataStructuresAssignment.id, studentId: liam.id, fileUrl: "/uploads/liam-ds-assignment1.docx", fileName: "liam-ds-assignment1.docx", fileType: "DOCX" as const, submittedAt: "2026-07-20T20:00:00Z" },

    // Algorithms Midterm (deadline 2026-07-25).
    { assessmentId: algorithmsMidterm.id, studentId: alice.id, fileUrl: "/uploads/alice-algorithms-midterm.pdf", fileName: "alice-algorithms-midterm.pdf", fileType: "PDF" as const, submittedAt: "2026-07-24T11:00:00Z" },
    { assessmentId: algorithmsMidterm.id, studentId: brian.id, fileUrl: "/uploads/brian-algorithms-midterm.pdf", fileName: "brian-algorithms-midterm.pdf", fileType: "PDF" as const, submittedAt: "2026-07-24T15:00:00Z" },
    { assessmentId: algorithmsMidterm.id, studentId: grace.id, fileUrl: "/uploads/grace-algorithms-midterm.pdf", fileName: "grace-algorithms-midterm.pdf", fileType: "PDF" as const, submittedAt: "2026-07-23T16:00:00Z" },
    { assessmentId: algorithmsMidterm.id, studentId: isla.id, fileUrl: "/uploads/isla-algorithms-midterm.pdf", fileName: "isla-algorithms-midterm.pdf", fileType: "PDF" as const, submittedAt: "2026-07-25T18:00:00Z" },
    // Late: submitted the day after the deadline.
    { assessmentId: algorithmsMidterm.id, studentId: liam.id, fileUrl: "/uploads/liam-algorithms-midterm.docx", fileName: "liam-algorithms-midterm.docx", fileType: "DOCX" as const, submittedAt: "2026-07-26T09:00:00Z" },

    // Business Ethics Essay (deadline 2026-08-15, still open).
    { assessmentId: businessEthicsEssay.id, studentId: carla.id, fileUrl: "/uploads/carla-business-ethics-essay.docx", fileName: "carla-business-ethics-essay.docx", fileType: "DOCX" as const, submittedAt: "2026-08-01T13:00:00Z" },
    { assessmentId: businessEthicsEssay.id, studentId: jamal.id, fileUrl: "/uploads/jamal-business-ethics-essay.pdf", fileName: "jamal-business-ethics-essay.pdf", fileType: "PDF" as const, submittedAt: "2026-08-02T10:00:00Z" },

    // Machine Learning Fundamentals (deadline 2026-08-20, still open).
    { assessmentId: machineLearningFundamentals.id, studentId: henry.id, fileUrl: "/uploads/henry-machine-learning.pdf", fileName: "henry-machine-learning.pdf", fileType: "PDF" as const, submittedAt: "2026-08-02T09:00:00Z" },

    // Marketing Fundamentals Quiz: deliberately no submissions at all.
  ];

  // The API writes real uploaded files to public/uploads/; seeded submissions
  // reference paths there too, so write a placeholder file for each one -
  // otherwise the "view file" link in the UI 404s for anything from the seed.
  await mkdir(UPLOAD_DIR, { recursive: true });

  for (const { submittedAt, ...data } of submissionSeeds) {
    await writeFile(
      path.join(UPLOAD_DIR, path.basename(data.fileUrl)),
      `Placeholder seed file for ${data.fileName}`
    );
    await prisma.submission.create({
      data: { ...data, createdAt: new Date(submittedAt), updatedAt: new Date(submittedAt) },
    });
  }

  // Grades deliberately cover all four classifications (Fail/Pass/Merit/Distinction)
  // in both published and withheld states, and Data Structures Assignment 1 is left
  // partially graded (Liam's submission ungraded) to show that realistic in-progress state too.
  await prisma.grade.createMany({
    data: [
      // Algorithms Midterm
      { assessmentId: algorithmsMidterm.id, studentId: alice.id, score: 78.5, isPublished: true, publishedAt: new Date("2026-07-28") },
      { assessmentId: algorithmsMidterm.id, studentId: brian.id, score: 65.0, isPublished: true, publishedAt: new Date("2026-07-28") },
      { assessmentId: algorithmsMidterm.id, studentId: grace.id, score: 35.0, isPublished: false },
      { assessmentId: algorithmsMidterm.id, studentId: isla.id, score: 55.0, isPublished: true, publishedAt: new Date("2026-07-29") },
      { assessmentId: algorithmsMidterm.id, studentId: liam.id, score: 82.0, isPublished: false },

      // Data Structures Assignment 1
      { assessmentId: dataStructuresAssignment.id, studentId: alice.id, score: 48.0, isPublished: true, publishedAt: new Date("2026-07-23") },
      { assessmentId: dataStructuresAssignment.id, studentId: brian.id, score: 71.0, isPublished: true, publishedAt: new Date("2026-07-23") },
      { assessmentId: dataStructuresAssignment.id, studentId: grace.id, score: 60.0, isPublished: false },
      { assessmentId: dataStructuresAssignment.id, studentId: isla.id, score: 38.5, isPublished: true, publishedAt: new Date("2026-07-24") },
      // Liam's Data Structures submission is left ungraded on purpose.
    ],
  });

  console.log(
    "Seed complete: 3 programmes, 14 students, 11 payments, 5 assessments, 13 submissions, 9 grades."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

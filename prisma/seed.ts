import { prisma } from "../src/lib/prisma";

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
      feeDueDate: new Date("2026-07-01"),
    },
  });

  const business = await prisma.programme.create({
    data: {
      name: "BA Business Administration",
      feeAmount: 4000,
      feeDueDate: new Date("2026-07-01"),
    },
  });

  const alice = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0001",
      fullName: "Alice Johnson",
      email: "alice.johnson@example.com",
      dateOfBirth: new Date("2003-04-12"),
      programmeId: cs.id,
      academicYear: 1,
      status: "ENROLLED",
    },
  });

  // Partial payment, past the due date: appears overdue on the dashboard.
  const brian = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0002",
      fullName: "Brian Smith",
      email: "brian.smith@example.com",
      dateOfBirth: new Date("2002-11-05"),
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
      programmeId: business.id,
      academicYear: 1,
      status: "ENROLLED",
    },
  });

  // Deferred, unpaid: exercises the enrolment status filter alongside a balance.
  const david = await prisma.student.create({
    data: {
      studentId: "SMS-2025-0004",
      fullName: "David Lee",
      email: "david.lee@example.com",
      dateOfBirth: new Date("2001-08-30"),
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
      programmeId: cs.id,
      academicYear: 3,
      status: "ENROLLED",
      feeOverride: 3000,
    },
  });

  await prisma.payment.createMany({
    data: [
      { referenceNumber: "PMT-2026-000001", studentId: alice.id, amount: 5000, paidAt: new Date("2026-06-15") },
      { referenceNumber: "PMT-2026-000002", studentId: brian.id, amount: 2000, paidAt: new Date("2026-06-20") },
      { referenceNumber: "PMT-2026-000003", studentId: emma.id, amount: 1000, paidAt: new Date("2026-06-10") },
      { referenceNumber: "PMT-2026-000004", studentId: farid.id, amount: 4000, paidAt: new Date("2026-06-01") },
      { referenceNumber: "PMT-2026-000005", studentId: grace.id, amount: 3000, paidAt: new Date("2026-06-18") },
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

  // Deadline in the future relative to the other two: still open for submissions.
  const businessEthicsEssay = await prisma.assessment.create({
    data: {
      title: "Business Ethics Essay",
      module: "Business Ethics",
      programmeId: business.id,
      deadline: new Date("2026-08-15T23:59:00Z"),
    },
  });

  // Individual creates (not createMany) so each submission's updatedAt can be
  // explicitly backdated to its intended illustrative date. Without this,
  // every row defaults to "now", which is after every deadline below, and
  // the "late" flag (computed from updatedAt vs. assessment.deadline) would
  // incorrectly mark everything late rather than just the intended examples.
  const submissionSeeds = [
    // On time (Data Structures deadline was 2026-07-20).
    { assessmentId: dataStructuresAssignment.id, studentId: alice.id, fileUrl: "/uploads/alice-ds-assignment1.pdf", fileName: "alice-ds-assignment1.pdf", fileType: "PDF" as const, submittedAt: "2026-07-18T14:00:00Z" },
    // Late: submitted after the 2026-07-20 deadline.
    { assessmentId: dataStructuresAssignment.id, studentId: brian.id, fileUrl: "/uploads/brian-ds-assignment1.docx", fileName: "brian-ds-assignment1.docx", fileType: "DOCX" as const, submittedAt: "2026-07-22T10:00:00Z" },
    { assessmentId: dataStructuresAssignment.id, studentId: grace.id, fileUrl: "/uploads/grace-ds-assignment1.pdf", fileName: "grace-ds-assignment1.pdf", fileType: "PDF" as const, submittedAt: "2026-07-19T09:00:00Z" },
    // On time (Algorithms Midterm deadline was 2026-07-25).
    { assessmentId: algorithmsMidterm.id, studentId: alice.id, fileUrl: "/uploads/alice-algorithms-midterm.pdf", fileName: "alice-algorithms-midterm.pdf", fileType: "PDF" as const, submittedAt: "2026-07-24T11:00:00Z" },
    { assessmentId: algorithmsMidterm.id, studentId: brian.id, fileUrl: "/uploads/brian-algorithms-midterm.pdf", fileName: "brian-algorithms-midterm.pdf", fileType: "PDF" as const, submittedAt: "2026-07-24T15:00:00Z" },
    { assessmentId: algorithmsMidterm.id, studentId: grace.id, fileUrl: "/uploads/grace-algorithms-midterm.pdf", fileName: "grace-algorithms-midterm.pdf", fileType: "PDF" as const, submittedAt: "2026-07-23T16:00:00Z" },
    // On time (Business Ethics Essay deadline is 2026-08-15, still open).
    { assessmentId: businessEthicsEssay.id, studentId: carla.id, fileUrl: "/uploads/carla-business-ethics-essay.docx", fileName: "carla-business-ethics-essay.docx", fileType: "DOCX" as const, submittedAt: "2026-08-01T13:00:00Z" },
  ];

  for (const { submittedAt, ...data } of submissionSeeds) {
    await prisma.submission.create({
      data: { ...data, createdAt: new Date(submittedAt), updatedAt: new Date(submittedAt) },
    });
  }

  await prisma.grade.create({
    data: {
      assessmentId: algorithmsMidterm.id,
      studentId: alice.id,
      score: 78.5,
      isPublished: true,
      publishedAt: new Date("2026-07-28"),
    },
  });

  await prisma.grade.create({
    data: {
      assessmentId: algorithmsMidterm.id,
      studentId: brian.id,
      score: 65.0,
      isPublished: true,
      publishedAt: new Date("2026-07-28"),
    },
  });

  // Withheld: graded, but not yet visible to the student.
  await prisma.grade.create({
    data: {
      assessmentId: algorithmsMidterm.id,
      studentId: grace.id,
      score: 35.0,
      isPublished: false,
    },
  });

  console.log("Seed complete: 2 programmes, 7 students, 5 payments, 3 assessments, 7 submissions, 3 grades.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

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

  // Partial payment: 2 years in, so 2 installments (of 4) are due by now, but
  // only 1 has been paid, so he's exactly one installment ($1,250) overdue.
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

  // Deferred once already (deferredAt: 2024-06-01), so his schedule is
  // pushed back a year: enrolled 2023-09-15 would normally put him 2 full
  // years in by now, but the deferral drops that to 1, so 2 of 4
  // installments due (instead of 3), still unpaid, still overdue.
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
      deferredAt: new Date("2024-06-01"),
    },
  });

  // Withdrawn, with a partial payment on record before they left. Withdrawn
  // 2025-11-01, so the withdrawal's effective date (next Jan 1) was
  // 2026-01-01, already passed, and the freeze is permanent from there, 1
  // of 4 installments due, frozen for good regardless of how much more
  // calendar time passes.
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
      withdrawnAt: new Date("2025-11-01"),
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
      // Matches his last installment payment below (2025-09-01), the point
      // he'd actually finished paying and could realistically graduate.
      completedAt: new Date("2025-09-01"),
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

  // Pays year by year rather than all at once: 2 years in, has paid exactly
  // the 2 installments due so far ($2,500 of a $5,000 fee), so not overdue
  // despite not having paid the full programme fee yet.
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

  // Deferred with a partial payment, also not overdue (no due date on this
  // programme). Marked deferred recently (2026-03-01), so the deferral's
  // effective date (next Jan 1) is still in the future, demonstrating the
  // "scheduled, not yet in effect" state, complementing David Lee's
  // already-effective one.
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
      deferredAt: new Date("2026-03-01"),
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
      // Matches his last installment payment below (2025-10-20).
      completedAt: new Date("2025-10-20"),
    },
  });

  // These predate installmentYear (payments used to be a free-form amount,
  // not a specific year), so they're left without one rather than guessing
  // which year each amount was meant to cover. Every payment recorded
  // through the app from now on always has a year.
  // Every payment is a specific installment year at that student's own fixed
  // per-year rate (feeAmount / totalInstallments, or the fee override for
  // Grace), never a free-form amount. CS installments are $1,250/year,
  // Business $1,000/year, Data Science (Masters, 2 installments) $3,000/year,
  // Grace's overridden fee is $750/year.
  await prisma.payment.createMany({
    data: [
      // Alice: fully paid, all 4 CS installments upfront.
      {
        referenceNumber: "PMT-2026-000001",
        studentId: alice.id,
        installmentYear: 1,
        amount: 1250,
        paidAt: new Date("2025-10-01"),
      },
      {
        referenceNumber: "PMT-2026-000002",
        studentId: alice.id,
        installmentYear: 2,
        amount: 1250,
        paidAt: new Date("2026-01-15"),
      },
      {
        referenceNumber: "PMT-2026-000003",
        studentId: alice.id,
        installmentYear: 3,
        amount: 1250,
        paidAt: new Date("2026-04-01"),
      },
      {
        referenceNumber: "PMT-2026-000004",
        studentId: alice.id,
        installmentYear: 4,
        amount: 1250,
        paidAt: new Date("2026-06-15"),
      },
      // Brian: only year 1 paid, 2 installments due by now, appears overdue.
      {
        referenceNumber: "PMT-2026-000005",
        studentId: brian.id,
        installmentYear: 1,
        amount: 1250,
        paidAt: new Date("2024-10-01"),
      },
      // Emma: one installment paid before withdrawing.
      {
        referenceNumber: "PMT-2026-000006",
        studentId: emma.id,
        installmentYear: 1,
        amount: 1250,
        paidAt: new Date("2025-10-15"),
      },
      // Farid: fully paid across all 4 Business installments before completing.
      {
        referenceNumber: "PMT-2026-000007",
        studentId: farid.id,
        installmentYear: 1,
        amount: 1000,
        paidAt: new Date("2024-10-01"),
      },
      {
        referenceNumber: "PMT-2026-000008",
        studentId: farid.id,
        installmentYear: 2,
        amount: 1000,
        paidAt: new Date("2025-01-15"),
      },
      {
        referenceNumber: "PMT-2026-000009",
        studentId: farid.id,
        installmentYear: 3,
        amount: 1000,
        paidAt: new Date("2025-06-01"),
      },
      {
        referenceNumber: "PMT-2026-000010",
        studentId: farid.id,
        installmentYear: 4,
        amount: 1000,
        paidAt: new Date("2025-09-01"),
      },
      // Grace: fully paid across all 4 installments, at her overridden rate.
      {
        referenceNumber: "PMT-2026-000011",
        studentId: grace.id,
        installmentYear: 1,
        amount: 750,
        paidAt: new Date("2023-10-01"),
      },
      {
        referenceNumber: "PMT-2026-000012",
        studentId: grace.id,
        installmentYear: 2,
        amount: 750,
        paidAt: new Date("2024-06-01"),
      },
      {
        referenceNumber: "PMT-2026-000013",
        studentId: grace.id,
        installmentYear: 3,
        amount: 750,
        paidAt: new Date("2025-06-01"),
      },
      {
        referenceNumber: "PMT-2026-000014",
        studentId: grace.id,
        installmentYear: 4,
        amount: 750,
        paidAt: new Date("2026-06-01"),
      },
      // Isla: years 1 and 2, exactly matching the 2 installments due so far.
      {
        referenceNumber: "PMT-2026-000015",
        studentId: isla.id,
        installmentYear: 1,
        amount: 1250,
        paidAt: new Date("2024-10-05"),
      },
      {
        referenceNumber: "PMT-2026-000016",
        studentId: isla.id,
        installmentYear: 2,
        amount: 1250,
        paidAt: new Date("2025-10-25"),
      },
      // Jamal: fully paid across all 4 Business installments.
      {
        referenceNumber: "PMT-2026-000017",
        studentId: jamal.id,
        installmentYear: 1,
        amount: 1000,
        paidAt: new Date("2022-10-01"),
      },
      {
        referenceNumber: "PMT-2026-000018",
        studentId: jamal.id,
        installmentYear: 2,
        amount: 1000,
        paidAt: new Date("2023-06-01"),
      },
      {
        referenceNumber: "PMT-2026-000019",
        studentId: jamal.id,
        installmentYear: 3,
        amount: 1000,
        paidAt: new Date("2024-06-01"),
      },
      {
        referenceNumber: "PMT-2026-000020",
        studentId: jamal.id,
        installmentYear: 4,
        amount: 1000,
        paidAt: new Date("2025-06-01"),
      },
      // Fatima: one of two Masters installments paid, not overdue regardless
      // (no due date on this programme).
      {
        referenceNumber: "PMT-2026-000021",
        studentId: fatima.id,
        installmentYear: 1,
        amount: 3000,
        paidAt: new Date("2025-10-08"),
      },
      // Liam: fully paid across all 4 CS installments.
      {
        referenceNumber: "PMT-2026-000022",
        studentId: liam.id,
        installmentYear: 1,
        amount: 1250,
        paidAt: new Date("2023-10-22"),
      },
      {
        referenceNumber: "PMT-2026-000023",
        studentId: liam.id,
        installmentYear: 2,
        amount: 1250,
        paidAt: new Date("2024-06-22"),
      },
      {
        referenceNumber: "PMT-2026-000024",
        studentId: liam.id,
        installmentYear: 3,
        amount: 1250,
        paidAt: new Date("2025-06-22"),
      },
      {
        referenceNumber: "PMT-2026-000025",
        studentId: liam.id,
        installmentYear: 4,
        amount: 1250,
        paidAt: new Date("2026-06-22"),
      },
      // Noah: fully paid across both Masters installments before completing.
      {
        referenceNumber: "PMT-2026-000026",
        studentId: noah.id,
        installmentYear: 1,
        amount: 3000,
        paidAt: new Date("2024-10-20"),
      },
      {
        referenceNumber: "PMT-2026-000027",
        studentId: noah.id,
        installmentYear: 2,
        amount: 3000,
        paidAt: new Date("2025-10-20"),
      },
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
    {
      assessmentId: dataStructuresAssignment.id,
      studentId: alice.id,
      fileUrl: "/uploads/alice-ds-assignment1.pdf",
      fileName: "alice-ds-assignment1.pdf",
      fileType: "PDF" as const,
      submittedAt: "2026-07-18T14:00:00Z",
    },
    // Late: submitted after the deadline.
    {
      assessmentId: dataStructuresAssignment.id,
      studentId: brian.id,
      fileUrl: "/uploads/brian-ds-assignment1.docx",
      fileName: "brian-ds-assignment1.docx",
      fileType: "DOCX" as const,
      submittedAt: "2026-07-22T10:00:00Z",
    },
    {
      assessmentId: dataStructuresAssignment.id,
      studentId: grace.id,
      fileUrl: "/uploads/grace-ds-assignment1.pdf",
      fileName: "grace-ds-assignment1.pdf",
      fileType: "PDF" as const,
      submittedAt: "2026-07-19T09:00:00Z",
    },
    {
      assessmentId: dataStructuresAssignment.id,
      studentId: isla.id,
      fileUrl: "/uploads/isla-ds-assignment1.pdf",
      fileName: "isla-ds-assignment1.pdf",
      fileType: "PDF" as const,
      submittedAt: "2026-07-17T12:00:00Z",
    },
    {
      assessmentId: dataStructuresAssignment.id,
      studentId: liam.id,
      fileUrl: "/uploads/liam-ds-assignment1.docx",
      fileName: "liam-ds-assignment1.docx",
      fileType: "DOCX" as const,
      submittedAt: "2026-07-20T20:00:00Z",
    },

    // Algorithms Midterm (deadline 2026-07-25).
    {
      assessmentId: algorithmsMidterm.id,
      studentId: alice.id,
      fileUrl: "/uploads/alice-algorithms-midterm.pdf",
      fileName: "alice-algorithms-midterm.pdf",
      fileType: "PDF" as const,
      submittedAt: "2026-07-24T11:00:00Z",
    },
    {
      assessmentId: algorithmsMidterm.id,
      studentId: brian.id,
      fileUrl: "/uploads/brian-algorithms-midterm.pdf",
      fileName: "brian-algorithms-midterm.pdf",
      fileType: "PDF" as const,
      submittedAt: "2026-07-24T15:00:00Z",
    },
    {
      assessmentId: algorithmsMidterm.id,
      studentId: grace.id,
      fileUrl: "/uploads/grace-algorithms-midterm.pdf",
      fileName: "grace-algorithms-midterm.pdf",
      fileType: "PDF" as const,
      submittedAt: "2026-07-23T16:00:00Z",
    },
    {
      assessmentId: algorithmsMidterm.id,
      studentId: isla.id,
      fileUrl: "/uploads/isla-algorithms-midterm.pdf",
      fileName: "isla-algorithms-midterm.pdf",
      fileType: "PDF" as const,
      submittedAt: "2026-07-25T18:00:00Z",
    },
    // Late: submitted the day after the deadline.
    {
      assessmentId: algorithmsMidterm.id,
      studentId: liam.id,
      fileUrl: "/uploads/liam-algorithms-midterm.docx",
      fileName: "liam-algorithms-midterm.docx",
      fileType: "DOCX" as const,
      submittedAt: "2026-07-26T09:00:00Z",
    },

    // Business Ethics Essay (deadline 2026-08-15, still open).
    {
      assessmentId: businessEthicsEssay.id,
      studentId: carla.id,
      fileUrl: "/uploads/carla-business-ethics-essay.docx",
      fileName: "carla-business-ethics-essay.docx",
      fileType: "DOCX" as const,
      submittedAt: "2026-08-01T13:00:00Z",
    },
    {
      assessmentId: businessEthicsEssay.id,
      studentId: jamal.id,
      fileUrl: "/uploads/jamal-business-ethics-essay.pdf",
      fileName: "jamal-business-ethics-essay.pdf",
      fileType: "PDF" as const,
      submittedAt: "2026-08-02T10:00:00Z",
    },

    // Machine Learning Fundamentals (deadline 2026-08-20, still open).
    {
      assessmentId: machineLearningFundamentals.id,
      studentId: henry.id,
      fileUrl: "/uploads/henry-machine-learning.pdf",
      fileName: "henry-machine-learning.pdf",
      fileType: "PDF" as const,
      submittedAt: "2026-08-02T09:00:00Z",
    },

    // Marketing Fundamentals Quiz: deliberately no submissions at all.
  ];

  // The API writes real uploaded files to public/uploads/; seeded submissions
  // reference paths there too, so write a placeholder file for each one -
  // otherwise the "view file" link in the UI 404s for anything from the seed.
  await mkdir(UPLOAD_DIR, { recursive: true });

  for (const { submittedAt, ...data } of submissionSeeds) {
    await writeFile(
      path.join(UPLOAD_DIR, path.basename(data.fileUrl)),
      `Placeholder seed file for ${data.fileName}`,
    );
    await prisma.submission.create({
      data: {
        ...data,
        createdAt: new Date(submittedAt),
        updatedAt: new Date(submittedAt),
      },
    });
  }

  // Grades deliberately cover all four classifications (Fail/Pass/Merit/Distinction)
  // in both published and withheld states, and Data Structures Assignment 1 is left
  // partially graded (Liam's submission ungraded) to show that realistic in-progress state too.
  await prisma.grade.createMany({
    data: [
      // Algorithms Midterm
      {
        assessmentId: algorithmsMidterm.id,
        studentId: alice.id,
        score: 78.5,
        isPublished: true,
        publishedAt: new Date("2026-07-28"),
      },
      {
        assessmentId: algorithmsMidterm.id,
        studentId: brian.id,
        score: 65.0,
        isPublished: true,
        publishedAt: new Date("2026-07-28"),
      },
      {
        assessmentId: algorithmsMidterm.id,
        studentId: grace.id,
        score: 35.0,
        isPublished: false,
      },
      {
        assessmentId: algorithmsMidterm.id,
        studentId: isla.id,
        score: 55.0,
        isPublished: true,
        publishedAt: new Date("2026-07-29"),
      },
      {
        assessmentId: algorithmsMidterm.id,
        studentId: liam.id,
        score: 82.0,
        isPublished: false,
      },

      // Data Structures Assignment 1
      {
        assessmentId: dataStructuresAssignment.id,
        studentId: alice.id,
        score: 48.0,
        isPublished: true,
        publishedAt: new Date("2026-07-23"),
      },
      {
        assessmentId: dataStructuresAssignment.id,
        studentId: brian.id,
        score: 71.0,
        isPublished: true,
        publishedAt: new Date("2026-07-23"),
      },
      {
        assessmentId: dataStructuresAssignment.id,
        studentId: grace.id,
        score: 60.0,
        isPublished: false,
      },
      {
        assessmentId: dataStructuresAssignment.id,
        studentId: isla.id,
        score: 38.5,
        isPublished: true,
        publishedAt: new Date("2026-07-24"),
      },
      // Liam's Data Structures submission is left ungraded on purpose.
    ],
  });

  console.log(
    "Seed complete: 3 programmes, 14 students, 27 payments, 5 assessments, 13 submissions, 9 grades.",
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

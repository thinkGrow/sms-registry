import type { Payment, Programme, Student } from "@/generated/prisma/client";

// Prisma's Decimal type can't cross the Server -> Client Component boundary
// (Next.js only supports plain JSON-serializable values there), so these
// convert it to a plain number before data is passed down to client code.

export type SerializedProgramme = Omit<Programme, "feeAmount"> & {
  feeAmount: number;
};

export type SerializedStudent = Omit<Student, "feeOverride"> & {
  feeOverride: number | null;
};

// Fields are picked explicitly (not spread) so that relations attached by
// whatever `include` a query happens to use (e.g. payments, submissions)
// never silently ride along into a Client Component unserialized.

export function serializeProgramme(programme: Programme): SerializedProgramme {
  return {
    id: programme.id,
    name: programme.name,
    feeAmount: Number(programme.feeAmount),
    degreeLevel: programme.degreeLevel,
    feeDueDate: programme.feeDueDate,
    createdAt: programme.createdAt,
    updatedAt: programme.updatedAt,
  };
}

export function serializeStudent(student: Student): SerializedStudent {
  return {
    id: student.id,
    studentId: student.studentId,
    fullName: student.fullName,
    email: student.email,
    dateOfBirth: student.dateOfBirth,
    enrolmentDate: student.enrolmentDate,
    programmeId: student.programmeId,
    academicYear: student.academicYear,
    status: student.status,
    feeOverride: student.feeOverride !== null ? Number(student.feeOverride) : null,
    deferredYears: student.deferredYears,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
}

export type SerializedPayment = Omit<Payment, "amount"> & { amount: number };

export function serializePayment(payment: Payment): SerializedPayment {
  return {
    id: payment.id,
    referenceNumber: payment.referenceNumber,
    studentId: payment.studentId,
    amount: Number(payment.amount),
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

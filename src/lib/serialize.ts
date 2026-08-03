import type { Programme, Student } from "@/generated/prisma/client";

// Prisma's Decimal type can't cross the Server -> Client Component boundary
// (Next.js only supports plain JSON-serializable values there), so these
// convert it to a plain number before data is passed down to client code.

export type SerializedProgramme = Omit<Programme, "feeAmount"> & {
  feeAmount: number;
};

export type SerializedStudent = Omit<Student, "feeOverride"> & {
  feeOverride: number | null;
};

export function serializeProgramme(programme: Programme): SerializedProgramme {
  return { ...programme, feeAmount: Number(programme.feeAmount) };
}

export function serializeStudent(student: Student): SerializedStudent {
  return {
    ...student,
    feeOverride: student.feeOverride !== null ? Number(student.feeOverride) : null,
  };
}

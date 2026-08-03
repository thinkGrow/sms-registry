import { prisma } from "@/lib/prisma";

// Generates the next sequential SMS-<year>-<0001> id for the given year
// (defaults to the current year). Sequence resets each year since it's
// scoped to ids starting with that year's prefix.
//
// Known limitation: this reads the current max then writes, so two
// simultaneous requests could theoretically compute the same id. Given
// this is a single-registry-team internal tool rather than a high-concurrency
// public system, that race is accepted rather than solved with a dedicated
// DB sequence.
export async function generateStudentId(
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `SMS-${year}-`;

  const latest = await prisma.student.findFirst({
    where: { studentId: { startsWith: prefix } },
    orderBy: { studentId: "desc" },
  });

  const nextSequence = latest
    ? parseInt(latest.studentId.slice(prefix.length), 10) + 1
    : 1;

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

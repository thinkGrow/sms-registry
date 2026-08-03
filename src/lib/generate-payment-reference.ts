import { prisma } from "@/lib/prisma";

// Generates the next sequential PMT-<year>-<000001> reference (6 digits,
// vs. 4 for student ids, since payments are a higher-volume record).
// Same accepted race-condition limitation as generateStudentId.
export async function generatePaymentReference(
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `PMT-${year}-`;

  const latest = await prisma.payment.findFirst({
    where: { referenceNumber: { startsWith: prefix } },
    orderBy: { referenceNumber: "desc" },
  });

  const nextSequence = latest
    ? parseInt(latest.referenceNumber.slice(prefix.length), 10) + 1
    : 1;

  return `${prefix}${String(nextSequence).padStart(6, "0")}`;
}

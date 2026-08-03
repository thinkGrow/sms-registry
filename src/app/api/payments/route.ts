import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePaymentReference } from "@/lib/generate-payment-reference";
import { requireStaffOrSelf } from "@/lib/api-auth";
import { getStudentFeeAmount } from "@/lib/balance";
import { paymentCreateSchema } from "@/lib/validations/payment";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = paymentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const auth = await requireStaffOrSelf(parsed.data.studentId);
  if (!auth.ok) return auth.response;

  const student = await prisma.student.findUnique({
    where: { id: parsed.data.studentId },
    include: { programme: true, payments: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Don't allow a payment to push the student past their fee, once fully
  // paid, no further payments should be recorded (staff or self-service).
  const feeAmount = getStudentFeeAmount(student, student.programme);
  const totalPaid = student.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  if (totalPaid + parsed.data.amount > feeAmount) {
    const remaining = feeAmount - totalPaid;
    return NextResponse.json(
      {
        error:
          remaining <= 0
            ? "This student's fee is already fully paid; no further payments are needed."
            : `This payment would exceed the outstanding fee. Remaining balance: $${remaining.toFixed(2)}.`,
      },
      { status: 400 }
    );
  }

  const referenceNumber = await generatePaymentReference();

  const payment = await prisma.payment.create({
    data: { ...parsed.data, referenceNumber },
  });

  return NextResponse.json(payment, { status: 201 });
}

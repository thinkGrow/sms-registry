import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePaymentReference } from "@/lib/generate-payment-reference";
import { requireStaffOrSelf } from "@/lib/api-auth";
import { getStudentFeeAmount, TOTAL_INSTALLMENTS } from "@/lib/balance";
import { paymentCreateSchema } from "@/lib/validations/payment";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = paymentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
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

  const totalInstallments = TOTAL_INSTALLMENTS[student.programme.degreeLevel];
  if (parsed.data.installmentYear > totalInstallments) {
    return NextResponse.json(
      {
        error: `This programme only has ${totalInstallments} installment year${totalInstallments === 1 ? "" : "s"}.`,
      },
      { status: 400 },
    );
  }

  const alreadyPaid = student.payments.some(
    (p) => p.installmentYear === parsed.data.installmentYear,
  );
  if (alreadyPaid) {
    return NextResponse.json(
      { error: `Year ${parsed.data.installmentYear} has already been paid.` },
      { status: 400 },
    );
  }

  // The amount is always the student's own per-year installment, never
  // client-supplied, so a payment can't be recorded for the wrong amount.
  const feeAmount = getStudentFeeAmount(student, student.programme);
  const amount = feeAmount / totalInstallments;

  // Defensive, not the primary guard: the one-payment-per-year rule already
  // prevents overpaying through the new flow on its own, but payments
  // recorded before this existed have no installmentYear and may already
  // total more than the fee (a free-form amount at the time), so this still
  // needs checking against the running total, not just the year slot.
  const totalPaid = student.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  if (totalPaid + amount > feeAmount) {
    const remaining = feeAmount - totalPaid;
    return NextResponse.json(
      {
        error:
          remaining <= 0
            ? "This student's fee is already fully paid; no further payments are needed."
            : `This payment would exceed the outstanding fee. Remaining balance: $${remaining.toFixed(2)}.`,
      },
      { status: 400 },
    );
  }

  const referenceNumber = await generatePaymentReference();

  const payment = await prisma.payment.create({
    data: {
      studentId: parsed.data.studentId,
      installmentYear: parsed.data.installmentYear,
      paidAt: parsed.data.paidAt,
      amount,
      referenceNumber,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}

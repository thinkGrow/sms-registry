import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { getStudentFeeAmount, TOTAL_INSTALLMENTS } from "@/lib/balance";
import { paymentUpdateSchema } from "@/lib/validations/payment";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = paymentUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Recompute the amount from the new year if it's actually changing; the
  // amount is never client-supplied, same as on create.
  let amount: number | undefined;
  if (parsed.data.installmentYear !== undefined) {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const student = await prisma.student.findUnique({
      where: { id: existing.studentId },
      include: { programme: true, payments: true },
    });
    if (student) {
      const totalInstallments =
        TOTAL_INSTALLMENTS[student.programme.degreeLevel];
      if (parsed.data.installmentYear > totalInstallments) {
        return NextResponse.json(
          {
            error: `This programme only has ${totalInstallments} installment year${totalInstallments === 1 ? "" : "s"}.`,
          },
          { status: 400 },
        );
      }

      const alreadyPaid = student.payments.some(
        (p) => p.id !== id && p.installmentYear === parsed.data.installmentYear,
      );
      if (alreadyPaid) {
        return NextResponse.json(
          {
            error: `Year ${parsed.data.installmentYear} has already been paid.`,
          },
          { status: 400 },
        );
      }

      amount =
        getStudentFeeAmount(student, student.programme) / totalInstallments;

      // Defensive, not the primary guard: same reasoning as on create, a
      // legacy payment with no installmentYear may already have pushed the
      // running total past the fee on its own.
      const feeAmount = getStudentFeeAmount(student, student.programme);
      const totalExcludingThis = student.payments
        .filter((p) => p.id !== id)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      if (totalExcludingThis + amount > feeAmount) {
        const remaining = feeAmount - totalExcludingThis;
        return NextResponse.json(
          {
            error: `This would exceed the outstanding fee. Maximum: $${remaining.toFixed(2)}.`,
          },
          { status: 400 },
        );
      }
    }
  }

  try {
    const payment = await prisma.payment.update({
      where: { id },
      data: { ...parsed.data, ...(amount !== undefined && { amount }) },
    });
    return NextResponse.json(payment);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    await prisma.payment.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    throw error;
  }
}

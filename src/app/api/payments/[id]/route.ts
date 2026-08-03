import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { getStudentFeeAmount } from "@/lib/balance";
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
      { status: 400 }
    );
  }

  // Only need to check the fee cap if the amount is actually changing.
  if (parsed.data.amount !== undefined) {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const student = await prisma.student.findUnique({
      where: { id: existing.studentId },
      include: { programme: true, payments: true },
    });
    if (student) {
      const feeAmount = getStudentFeeAmount(student, student.programme);
      const totalExcludingThis = student.payments
        .filter((p) => p.id !== id)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      if (totalExcludingThis + parsed.data.amount > feeAmount) {
        const remaining = feeAmount - totalExcludingThis;
        return NextResponse.json(
          { error: `This amount would exceed the outstanding fee. Maximum: $${remaining.toFixed(2)}.` },
          { status: 400 }
        );
      }
    }
  }

  try {
    const payment = await prisma.payment.update({
      where: { id },
      data: parsed.data,
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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePaymentReference } from "@/lib/generate-payment-reference";
import { requireStaffOrSelf } from "@/lib/api-auth";
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
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const referenceNumber = await generatePaymentReference();

  const payment = await prisma.payment.create({
    data: { ...parsed.data, referenceNumber },
  });

  return NextResponse.json(payment, { status: 201 });
}

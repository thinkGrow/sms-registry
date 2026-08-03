import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentUpdateSchema } from "@/lib/validations/payment";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const parsed = paymentUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
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

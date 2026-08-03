import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { programmeUpdateSchema } from "@/lib/validations/programme";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const programme = await prisma.programme.findUnique({ where: { id } });

  if (!programme) {
    return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  }

  return NextResponse.json(programme);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = programmeUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const programme = await prisma.programme.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json(programme);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Programme not found" }, { status: 404 });
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A programme with this name already exists" },
        { status: 409 }
      );
    }
    throw error;
  }
}

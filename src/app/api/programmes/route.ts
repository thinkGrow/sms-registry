import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { programmeCreateSchema } from "@/lib/validations/programme";

export async function GET() {
  const programmes = await prisma.programme.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(programmes);
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = programmeCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const programme = await prisma.programme.create({ data: parsed.data });
    return NextResponse.json(programme, { status: 201 });
  } catch (error: unknown) {
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

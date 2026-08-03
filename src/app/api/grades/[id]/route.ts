import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { gradePublishSchema } from "@/lib/validations/grade";

type RouteParams = { params: Promise<{ id: string }> };

// Toggling publish/withhold. Publishing sets publishedAt; withholding clears
// it, since a withheld grade isn't meaningfully "published since" any date.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = gradePublishSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const grade = await prisma.grade.update({
      where: { id },
      data: {
        isPublished: parsed.data.isPublished,
        publishedAt: parsed.data.isPublished ? new Date() : null,
      },
    });
    return NextResponse.json(grade);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Grade not found" }, { status: 404 });
    }
    throw error;
  }
}

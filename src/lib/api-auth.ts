import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

type AuthFailure = { ok: false; response: NextResponse };
type AuthSuccess = { ok: true };
type AuthResult = AuthFailure | AuthSuccess;

const FORBIDDEN = NextResponse.json({ error: "Not authorized" }, { status: 403 });

// Staff-only actions: creating/editing students and assessments, entering
// grades, publish/withhold, editing or deleting a payment record.
export async function requireStaff(): Promise<AuthResult> {
  const session = await getSession();
  if (session.role !== "STAFF") {
    return { ok: false, response: FORBIDDEN };
  }
  return { ok: true };
}

// Staff, or the student themselves: recording a payment (staff logging one
// received outside the system, or a student paying their own fee online).
export async function requireStaffOrSelf(studentId: string): Promise<AuthResult> {
  const session = await getSession();
  if (session.role === "STAFF") return { ok: true };
  if (session.role === "STUDENT" && session.studentId === studentId) {
    return { ok: true };
  }
  return { ok: false, response: FORBIDDEN };
}

// The student themselves only, never staff: submitting assessment work is a
// student-only self-service action (see README - staff can no longer submit
// on behalf of a student).
export async function requireSelf(studentId: string): Promise<AuthResult> {
  const session = await getSession();
  if (session.role === "STUDENT" && session.studentId === studentId) {
    return { ok: true };
  }
  return { ok: false, response: FORBIDDEN };
}

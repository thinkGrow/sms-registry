import { cookies } from "next/headers";

export type Session = { role: "STAFF" } | { role: "STUDENT"; studentId: string };

export const SESSION_COOKIE = "sms_session";

// No auth: a plain role toggle stored in a cookie, per the assessment's own
// "auth optional, a simple role toggle is fine" allowance. Defaults to STAFF
// when no cookie is set.
export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return { role: "STAFF" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.role === "STUDENT" && typeof parsed.studentId === "string") {
      return { role: "STUDENT", studentId: parsed.studentId };
    }
    return { role: "STAFF" };
  } catch {
    return { role: "STAFF" };
  }
}

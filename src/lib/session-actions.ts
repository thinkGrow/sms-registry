"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./session";

// Assessment pages render the same route for both roles (just filtered
// content), so switching identity while on one can just stay put instead of
// bouncing to a profile. Every other page (dashboard, students list, another
// student's profile) has role-specific content that doesn't carry over, so
// those fall back to each role's own default landing page.
function preservedDestination(currentPath: string | undefined) {
  return currentPath?.startsWith("/assessments") ? currentPath : null;
}

export async function switchToStaff(currentPath?: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify({ role: "STAFF" }), { path: "/" });
  redirect(preservedDestination(currentPath) ?? "/");
}

export async function switchToStudent(studentId: string, currentPath?: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    JSON.stringify({ role: "STUDENT", studentId }),
    { path: "/" }
  );
  redirect(preservedDestination(currentPath) ?? `/students/${studentId}`);
}

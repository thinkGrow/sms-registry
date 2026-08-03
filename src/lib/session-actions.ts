"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./session";

export async function switchToStaff() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify({ role: "STAFF" }), { path: "/" });
  redirect("/");
}

export async function switchToStudent(studentId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    JSON.stringify({ role: "STUDENT", studentId }),
    { path: "/" }
  );
  redirect(`/students/${studentId}`);
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateStudentBalance } from "@/lib/balance";
import { getSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await getSession();
  if (session.role === "STUDENT") {
    redirect(`/students/${session.studentId}`);
  }

  const [students, submissions, grades] = await Promise.all([
    prisma.student.findMany({
      include: { programme: true, payments: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.submission.findMany({
      include: { student: true, assessment: true },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.grade.findMany({ select: { studentId: true, assessmentId: true } }),
  ]);

  const withBalance = students.map((student) => ({
    student,
    balance: calculateStudentBalance(student, student.programme, student.payments),
  }));

  const overdue = withBalance.filter(({ balance }) => balance.isOverdue);

  // A submission is "ungraded" if no Grade row exists at all for its
  // (student, assessment) pair, not just unpublished. There's no direct
  // relation between Submission and Grade (each keys independently off
  // studentId+assessmentId), so this is a set lookup rather than a join,
  // same pattern used to match submissions to grades on the assessment
  // detail page. Oldest-waiting first, so the longest-neglected submission
  // surfaces at the top.
  const gradedKeys = new Set(grades.map((g) => `${g.studentId}:${g.assessmentId}`));
  const ungraded = submissions.filter(
    (s) => !gradedKeys.has(`${s.studentId}:${s.assessmentId}`)
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Registry Dashboard</h1>
        <Button nativeButton={false} render={<Link href="/students" />}>
          View All Students
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{students.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">
              Overdue Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-destructive">{overdue.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">
              Ungraded Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{ungraded.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students with Overdue Fees</CardTitle>
        </CardHeader>
        <CardContent>
          {overdue.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No overdue fees right now.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {overdue.map(({ student, balance }) => (
                <li key={student.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/students/${student.id}`}
                      className="font-medium hover:underline"
                    >
                      {student.fullName}
                    </Link>
                    <div className="text-muted-foreground text-xs">
                      {student.studentId} &middot; {student.programme.name}
                    </div>
                  </div>
                  <Badge variant="destructive">
                    ${balance.balance.toFixed(2)} overdue
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submissions Awaiting Grading</CardTitle>
        </CardHeader>
        <CardContent>
          {ungraded.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing waiting to be graded right now.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {ungraded.map((submission) => {
                const isLate = new Date(submission.updatedAt) > new Date(submission.assessment.deadline);
                return (
                  <li key={submission.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link
                        href={`/assessments/${submission.assessmentId}`}
                        className="font-medium hover:underline"
                      >
                        {submission.assessment.title}
                      </Link>
                      <div className="text-muted-foreground text-xs">
                        <Link href={`/students/${submission.studentId}`} className="hover:underline">
                          {submission.student.fullName}
                        </Link>
                        {" · submitted "}
                        {new Date(submission.updatedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    {isLate && <Badge variant="warning">Late</Badge>}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

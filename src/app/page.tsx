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

  const students = await prisma.student.findMany({
    include: { programme: true, payments: true },
    orderBy: { fullName: "asc" },
  });

  const withBalance = students.map((student) => ({
    student,
    balance: calculateStudentBalance(student, student.programme, student.payments),
  }));

  const overdue = withBalance.filter(({ balance }) => balance.isOverdue);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Registry Dashboard</h1>
        <Button render={<Link href="/students" />}>View All Students</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
              Overdue Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-destructive">{overdue.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students with Overdue Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {overdue.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No overdue balances right now.
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
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getYearlyFeeBreakdown, TOTAL_INSTALLMENTS } from "@/lib/balance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSession } from "@/lib/session";

const degreeLevelLabels = {
  BACHELORS: "Bachelor's",
  MASTERS: "Master's",
} as const;

export default async function ProgrammeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  const isStaff = session.role === "STAFF";

  const programme = await prisma.programme.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });

  if (!programme) {
    notFound();
  }

  const breakdown = getYearlyFeeBreakdown(programme);
  const totalInstallments = TOTAL_INSTALLMENTS[programme.degreeLevel];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/programmes" />}>
        Back to Programmes
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{programme.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-border divide-y">
            <div className="grid grid-cols-3 gap-4 py-3 text-sm">
              <dt className="text-muted-foreground">Degree Level</dt>
              <dd className="col-span-2">
                <Badge variant="info">{degreeLevelLabels[programme.degreeLevel]}</Badge>
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4 py-3 text-sm">
              <dt className="text-muted-foreground">Total Fee</dt>
              <dd className="col-span-2">${Number(programme.feeAmount).toFixed(2)}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 py-3 text-sm">
              <dt className="text-muted-foreground">Programme Length</dt>
              <dd className="col-span-2">
                {totalInstallments} year{totalInstallments === 1 ? "" : "s"}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4 py-3 text-sm">
              <dt className="text-muted-foreground">Overdue Tracking</dt>
              <dd className="col-span-2">
                {programme.feeDueDate ? (
                  <Badge variant="success">Tracked</Badge>
                ) : (
                  <Badge variant="secondary">Not tracked</Badge>
                )}
              </dd>
            </div>
            {isStaff && (
              <div className="grid grid-cols-3 gap-4 py-3 text-sm">
                <dt className="text-muted-foreground">Students</dt>
                <dd className="col-span-2">
                  <Link
                    href={`/students?programmeId=${programme.id}`}
                    className="hover:underline"
                  >
                    {programme._count.students} enrolled
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fee Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">
            One installment per year of study, evenly split from the total fee. An
            individual student's actual schedule is anchored to their own enrolment
            date, and may differ if they have a fee override, this is the standard
            breakdown for the programme itself.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Amount Due That Year</TableHead>
                <TableHead>Cumulative Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.map(({ year, amount, cumulativeAmount }) => (
                <TableRow key={year}>
                  <TableCell>Year {year}</TableCell>
                  <TableCell>${amount.toFixed(2)}</TableCell>
                  <TableCell>${cumulativeAmount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

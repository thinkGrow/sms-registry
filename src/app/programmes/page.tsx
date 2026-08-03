import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getYearlyFeeBreakdown, TOTAL_INSTALLMENTS } from "@/lib/balance";
import { getSession } from "@/lib/session";
import { serializeProgramme } from "@/lib/serialize";
import { ProgrammeFormDialog } from "./_components/programme-form-dialog";

const degreeLevelLabels = {
  BACHELORS: "Bachelor's",
  MASTERS: "Master's",
} as const;

export default async function ProgrammesPage() {
  const session = await getSession();
  const isStaff = session.role === "STAFF";

  const programmes = await prisma.programme.findMany({
    include: { _count: { select: { students: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Programmes</h1>
          <p className="text-muted-foreground text-sm">
            {programmes.length} programme{programmes.length === 1 ? "" : "s"}
          </p>
        </div>
        {isStaff && <ProgrammeFormDialog />}
      </div>

      <Card>
        <CardHeader />
        <CardContent>
          {programmes.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No programmes yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Degree Level</TableHead>
                  <TableHead>Total Fee</TableHead>
                  <TableHead>Per Year</TableHead>
                  {isStaff && <TableHead>Students</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programmes.map((programme) => {
                  const breakdown = getYearlyFeeBreakdown(programme);
                  return (
                    <TableRow key={programme.id}>
                      <TableCell>
                        <Link
                          href={`/programmes/${programme.id}`}
                          className="font-medium hover:underline"
                        >
                          {programme.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{degreeLevelLabels[programme.degreeLevel]}</Badge>
                      </TableCell>
                      <TableCell>${Number(programme.feeAmount).toFixed(2)}</TableCell>
                      <TableCell>
                        ${breakdown[0].amount.toFixed(2)} × {TOTAL_INSTALLMENTS[programme.degreeLevel]} years
                      </TableCell>
                      {isStaff && <TableCell>{programme._count.students}</TableCell>}
                      <TableCell className="flex justify-end gap-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/programmes/${programme.id}`} />}
                        >
                          Details
                        </Button>
                        {isStaff && (
                          <ProgrammeFormDialog
                            key={`${programme.id}-${programme.updatedAt}`}
                            programme={serializeProgramme(programme)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

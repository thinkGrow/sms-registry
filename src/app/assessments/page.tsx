import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { serializeProgramme } from "@/lib/serialize";
import { getSession } from "@/lib/session";
import { AssessmentFormDialog } from "./_components/assessment-form-dialog";

export default async function AssessmentsPage() {
  const session = await getSession();
  const isStaff = session.role === "STAFF";

  // Students only see assessments for their own programme; staff see all.
  const programmeFilter =
    session.role === "STUDENT"
      ? (await prisma.student.findUnique({ where: { id: session.studentId } }))
          ?.programmeId
      : undefined;

  const [assessments, programmes] = await Promise.all([
    prisma.assessment.findMany({
      where: { ...(programmeFilter && { programmeId: programmeFilter }) },
      include: { programme: true, submissions: true },
      orderBy: { deadline: "asc" },
    }),
    prisma.programme.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serializedProgrammes = programmes.map(serializeProgramme);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assessments</h1>
          <p className="text-muted-foreground text-sm">
            {assessments.length} assessment{assessments.length === 1 ? "" : "s"}
          </p>
        </div>
        {isStaff && <AssessmentFormDialog programmes={serializedProgrammes} />}
      </div>

      <Card>
        <CardHeader />
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No assessments yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => {
                  const isPast = new Date() > new Date(assessment.deadline);
                  return (
                    <TableRow key={assessment.id}>
                      <TableCell>
                        <Link
                          href={`/assessments/${assessment.id}`}
                          className="font-medium hover:underline"
                        >
                          {assessment.title}
                        </Link>
                      </TableCell>
                      <TableCell>{assessment.module}</TableCell>
                      <TableCell>{assessment.programme.name}</TableCell>
                      <TableCell>
                        {new Date(assessment.deadline).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>{assessment.submissions.length}</TableCell>
                      <TableCell>
                        <Badge variant={isPast ? "warning" : "success"}>
                          {isPast ? "Closed" : "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/assessments/${assessment.id}`} />}
                        >
                          Details
                        </Button>
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

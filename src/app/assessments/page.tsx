import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { serializeProgramme } from "@/lib/serialize";
import { getSession } from "@/lib/session";
import { AssessmentFormDialog } from "./_components/assessment-form-dialog";
import {
  classifyGrade,
  classificationLabels,
  classificationBadgeVariant,
} from "@/lib/classification";

export default async function AssessmentsPage() {
  const session = await getSession();
  const isStaff = session.role === "STAFF";

  // Students only see assessments for their own programme; staff see all.
  const programmeFilter =
    session.role === "STUDENT"
      ? (await prisma.student.findUnique({ where: { id: session.studentId } }))
          ?.programmeId
      : undefined;

  // For a student, only their own submission/grade is needed (to show a
  // per-row result), not the whole cohort's. Staff still get every
  // submission, since the "Submissions" column is a cohort-wide count.
  const ownRecordFilter =
    session.role === "STUDENT" ? { studentId: session.studentId } : undefined;

  const [assessments, programmes] = await Promise.all([
    prisma.assessment.findMany({
      where: { ...(programmeFilter && { programmeId: programmeFilter }) },
      include: {
        programme: true,
        submissions: { where: ownRecordFilter },
        grades: { where: ownRecordFilter },
      },
      orderBy: [{ module: "asc" }, { deadline: "asc" }],
    }),
    prisma.programme.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serializedProgrammes = programmes.map(serializeProgramme);

  // Grouped by module (a plain text field, not its own entity, see README)
  // rather than one flat list, so assessments for the same subject sit
  // together instead of interleaved by deadline across every module at once.
  const assessmentsByModule = new Map<string, typeof assessments>();
  for (const assessment of assessments) {
    const group = assessmentsByModule.get(assessment.module);
    if (group) {
      group.push(assessment);
    } else {
      assessmentsByModule.set(assessment.module, [assessment]);
    }
  }

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

      {assessments.length === 0 ? (
        <Card>
          <CardHeader />
          <CardContent>
            <p className="text-muted-foreground py-8 text-center text-sm">
              No assessments yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        Array.from(assessmentsByModule.entries()).map(
          ([module, moduleAssessments]) => (
            <Card key={module}>
              <CardHeader>
                <CardTitle>
                  {module} ({moduleAssessments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Programme</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>
                        {isStaff ? "Submissions" : "Your Result"}
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {moduleAssessments.map((assessment) => {
                      const isPast = new Date() > new Date(assessment.deadline);
                      // Only populated (and only ever containing this student's
                      // own record) when session.role === "STUDENT".
                      const mySubmission = assessment.submissions[0];
                      const myGrade = assessment.grades[0];
                      // "Ungraded" means no Grade row at all for that submission's
                      // (student, assessment) pair, same definition used on the
                      // dashboard's ungraded-submissions list. Only meaningful for
                      // staff, who get every submission/grade for this assessment.
                      const gradedStudentIds = new Set(
                        assessment.grades.map((g) => g.studentId),
                      );
                      const ungradedCount = assessment.submissions.filter(
                        (s) => !gradedStudentIds.has(s.studentId),
                      ).length;
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
                          <TableCell>{assessment.programme.name}</TableCell>
                          <TableCell>
                            {new Date(assessment.deadline).toLocaleString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </TableCell>
                          <TableCell>
                            {isStaff ? (
                              <div className="flex items-center gap-2">
                                <span>{assessment.submissions.length}</span>
                                {ungradedCount > 0 && (
                                  <Badge variant="secondary">
                                    {ungradedCount} ungraded
                                  </Badge>
                                )}
                              </div>
                            ) : !mySubmission ? (
                              <span className="text-muted-foreground">
                                Not submitted
                              </span>
                            ) : myGrade?.isPublished ? (
                              <Badge
                                variant={
                                  classificationBadgeVariant[
                                    classifyGrade(Number(myGrade.score))
                                  ]
                                }
                              >
                                {Number(myGrade.score)} ·{" "}
                                {
                                  classificationLabels[
                                    classifyGrade(Number(myGrade.score))
                                  ]
                                }
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isPast ? "warning" : "success"}>
                              {isPast ? "Closed" : "Open"}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex justify-end gap-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              nativeButton={false}
                              render={
                                <Link href={`/assessments/${assessment.id}`} />
                              }
                            >
                              Details
                            </Button>
                            {isStaff && (
                              <AssessmentFormDialog
                                key={`${assessment.id}-${assessment.updatedAt}`}
                                programmes={serializedProgrammes}
                                assessment={assessment}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ),
        )
      )}
    </div>
  );
}

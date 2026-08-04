import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeProgramme } from "@/lib/serialize";
import { getSession } from "@/lib/session";
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
import { AssessmentFormDialog } from "../_components/assessment-form-dialog";
import { SubmissionForm } from "../_components/submission-form";
import { GradesSection } from "../_components/grades-section";
import {
  classifyGrade,
  classificationLabels,
  classificationBadgeVariant,
} from "@/lib/classification";
import { effectiveStatus } from "@/lib/balance";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  const isStaff = session.role === "STAFF";

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      programme: true,
      submissions: { include: { student: true }, orderBy: { updatedAt: "desc" } },
      grades: true,
    },
  });

  if (!assessment) {
    notFound();
  }

  const gradeRows = assessment.submissions.map((submission) => {
    const grade = assessment.grades.find((g) => g.studentId === submission.studentId);
    return {
      studentId: submission.studentId,
      studentName: submission.student.fullName,
      fileUrl: submission.fileUrl,
      fileName: submission.fileName,
      gradeId: grade?.id ?? null,
      score: grade ? Number(grade.score) : null,
      isPublished: grade?.isPublished ?? false,
    };
  });
  const ungradedCount = gradeRows.filter((row) => row.gradeId === null).length;

  // Two separate conditions gate submission (matching the same eligibility
  // rule the API enforces server-side): the assessment must belong to the
  // student's own programme, and they must be actively enrolled. Being
  // deferred, withdrawn, or completed all block submission regardless of
  // whether the assessment window is still open, none of them mean the
  // student is currently doing coursework. Tracked separately so the message
  // shown can name the actual reason, not just "programme" or a generic
  // "not enrolled".
  const currentStudent =
    session.role === "STUDENT"
      ? await prisma.student.findUnique({ where: { id: session.studentId } })
      : null;
  const isCorrectProgramme = currentStudent?.programmeId === assessment.programmeId;
  // A deferral auto-reverts to ENROLLED once its grace year ends, computed
  // here rather than stored (see effectiveStatus in balance.ts), so this
  // reads the live status, not whatever DEFERRED/ENROLLED was last set.
  const currentStudentStatus = currentStudent
    ? effectiveStatus(currentStudent.status, currentStudent.deferredAt)
    : undefined;
  const isEnrolled = currentStudentStatus === "ENROLLED";
  const canCurrentStudentSubmit =
    session.role === "STUDENT" && isCorrectProgramme && isEnrolled;

  const currentStudentSubmission =
    session.role === "STUDENT"
      ? assessment.submissions.find((s) => s.studentId === session.studentId)
      : undefined;
  const currentStudentGrade =
    session.role === "STUDENT"
      ? assessment.grades.find((g) => g.studentId === session.studentId)
      : undefined;

  const visibleSubmissions = isStaff
    ? assessment.submissions
    : assessment.submissions.filter(
        (s) => session.role === "STUDENT" && s.studentId === session.studentId
      );

  const deadline = new Date(assessment.deadline);
  const isPastDeadline = new Date() > deadline;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/assessments" />}
        >
          Back to Assessments
        </Button>
        {isStaff && (
          <AssessmentFormDialog
            programmes={[serializeProgramme(assessment.programme)]}
            assessment={{
              id: assessment.id,
              title: assessment.title,
              module: assessment.module,
              programmeId: assessment.programmeId,
              deadline: assessment.deadline,
            }}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{assessment.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-border divide-y">
            <div className="grid grid-cols-3 gap-4 py-3 text-sm">
              <dt className="text-muted-foreground">Module</dt>
              <dd className="col-span-2">{assessment.module}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 py-3 text-sm">
              <dt className="text-muted-foreground">Programme</dt>
              <dd className="col-span-2">{assessment.programme.name}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 py-3 text-sm">
              <dt className="text-muted-foreground">Deadline</dt>
              <dd className="col-span-2">
                {deadline.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                <Badge variant={isPastDeadline ? "warning" : "success"} className="ml-2">
                  {isPastDeadline ? "Closed" : "Open"}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {!isStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Work</CardTitle>
          </CardHeader>
          <CardContent>
            {canCurrentStudentSubmit && session.role === "STUDENT" ? (
              <div className="space-y-3">
                {currentStudentSubmission && (
                  <p className="text-muted-foreground text-sm">
                    You already submitted{" "}
                    <span className="font-medium">{currentStudentSubmission.fileName}</span> on{" "}
                    {new Date(currentStudentSubmission.updatedAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    . Submitting again will replace it
                    {currentStudentGrade
                      ? ", and your current grade may no longer reflect the new file"
                      : ""}
                    .
                  </p>
                )}
                <SubmissionForm
                  assessmentId={assessment.id}
                  studentId={session.studentId}
                  hasExistingSubmission={Boolean(currentStudentSubmission)}
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {!isCorrectProgramme
                  ? "This assessment isn't open to your programme."
                  : currentStudentStatus === "DEFERRED"
                    ? "You've deferred your studies, so you can't submit assessment work until you resume."
                    : currentStudentStatus === "WITHDRAWN"
                      ? "You've withdrawn from your programme, so you can no longer submit assessment work."
                      : "You've completed your programme, so you can no longer submit assessment work."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {isStaff ? `Submissions (${visibleSubmissions.length})` : "Your Submission"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visibleSubmissions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  {!isStaff && <TableHead>Result</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSubmissions.map((submission) => {
                  const isLate = new Date(submission.updatedAt) > deadline;
                  const isResubmission =
                    new Date(submission.createdAt).getTime() !==
                    new Date(submission.updatedAt).getTime();
                  const grade = assessment.grades.find(
                    (g) => g.studentId === submission.studentId
                  );
                  const resubmittedAfterGrading =
                    grade !== undefined &&
                    new Date(submission.updatedAt) > new Date(grade.updatedAt);
                  return (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <Link
                          href={`/students/${submission.studentId}`}
                          className="hover:underline"
                        >
                          {submission.student.fullName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <a
                          href={submission.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {submission.fileName}
                        </a>
                      </TableCell>
                      <TableCell>
                        {new Date(submission.updatedAt).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="flex flex-wrap gap-1.5">
                        {isLate && <Badge variant="warning">Late</Badge>}
                        {resubmittedAfterGrading ? (
                          <Badge variant="destructive">Resubmitted after grading</Badge>
                        ) : (
                          isResubmission && <Badge variant="info">Resubmitted</Badge>
                        )}
                        {isStaff && !grade && <Badge variant="secondary">Ungraded</Badge>}
                      </TableCell>
                      {!isStaff && (
                        <TableCell>
                          {currentStudentGrade?.isPublished ? (
                            <Badge
                              variant={
                                classificationBadgeVariant[
                                  classifyGrade(Number(currentStudentGrade.score))
                                ]
                              }
                            >
                              {Number(currentStudentGrade.score)} ·{" "}
                              {classificationLabels[classifyGrade(Number(currentStudentGrade.score))]}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle>
              Grades{ungradedCount > 0 ? ` (${ungradedCount} ungraded)` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GradesSection assessmentId={assessment.id} rows={gradeRows} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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
      gradeId: grade?.id ?? null,
      score: grade ? Number(grade.score) : null,
      isPublished: grade?.isPublished ?? false,
    };
  });

  // Only show the submit form if this assessment belongs to the student's
  // own programme and they're enrolled (matches the same eligibility rule
  // the API enforces server-side).
  const canCurrentStudentSubmit =
    session.role === "STUDENT" &&
    (await prisma.student.count({
      where: {
        id: session.studentId,
        programmeId: assessment.programmeId,
        status: "ENROLLED",
      },
    })) > 0;

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
              <SubmissionForm assessmentId={assessment.id} studentId={session.studentId} />
            ) : (
              <p className="text-muted-foreground text-sm">
                This assessment isn&apos;t open to your programme.
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSubmissions.map((submission) => {
                  const isLate = new Date(submission.updatedAt) > deadline;
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
                      <TableCell>
                        {isLate && <Badge variant="warning">Late</Badge>}
                      </TableCell>
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
            <CardTitle>Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <GradesSection assessmentId={assessment.id} rows={gradeRows} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

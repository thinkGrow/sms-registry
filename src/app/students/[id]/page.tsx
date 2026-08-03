import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeProgramme, serializeStudent, serializePayment } from "@/lib/serialize";
import { calculateStudentBalance } from "@/lib/balance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudentFormDialog } from "../_components/student-form-dialog";
import { PaymentsSection } from "../_components/payments-section";
import {
  enrolmentStatusBadgeVariant,
  enrolmentStatusLabels,
} from "@/lib/student-status";
import {
  classifyGrade,
  classificationLabels,
  classificationBadgeVariant,
} from "@/lib/classification";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [student, programmes] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: {
        programme: true,
        payments: { orderBy: { paidAt: "desc" } },
        grades: { include: { assessment: true }, orderBy: { updatedAt: "desc" } },
      },
    }),
    prisma.programme.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!student) {
    notFound();
  }

  const serializedStudent = {
    ...serializeStudent(student),
    programme: serializeProgramme(student.programme),
  };
  const serializedProgrammes = programmes.map(serializeProgramme);
  const serializedPayments = student.payments.map(serializePayment);
  const balance = calculateStudentBalance(student, student.programme, student.payments);

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Student ID", value: <span className="font-mono">{student.studentId}</span> },
    { label: "Full name", value: student.fullName },
    { label: "Email", value: student.email },
    { label: "Date of birth", value: formatDate(student.dateOfBirth) },
    { label: "Programme", value: student.programme.name },
    { label: "Academic year", value: student.academicYear },
    {
      label: "Enrolment status",
      value: (
        <Badge variant={enrolmentStatusBadgeVariant[student.status]}>
          {enrolmentStatusLabels[student.status]}
        </Badge>
      ),
    },
    {
      label: "Fee override",
      value:
        serializedStudent.feeOverride !== null
          ? `$${serializedStudent.feeOverride.toFixed(2)}`
          : "None (uses programme's standard fee)",
    },
    { label: "Created", value: formatDate(student.createdAt) },
    { label: "Last updated", value: formatDate(student.updatedAt) },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" render={<Link href="/students" />}>
          Back to Students
        </Button>
        <StudentFormDialog programmes={serializedProgrammes} student={serializedStudent} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{student.fullName}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-border divide-y">
            {fields.map((field) => (
              <div key={field.label} className="grid grid-cols-3 gap-4 py-3 text-sm">
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="col-span-2">{field.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fees & Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentsSection
            studentId={student.id}
            payments={serializedPayments}
            balance={balance}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marksheet</CardTitle>
        </CardHeader>
        <CardContent>
          {student.grades.length === 0 ? (
            <p className="text-muted-foreground text-sm">No grades recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.grades.map((grade) => {
                  const score = Number(grade.score);
                  const classification = classifyGrade(score);
                  return (
                    <TableRow key={grade.id}>
                      <TableCell>
                        <Link
                          href={`/assessments/${grade.assessmentId}`}
                          className="hover:underline"
                        >
                          {grade.assessment.title}
                        </Link>
                        <div className="text-muted-foreground text-xs">
                          {grade.assessment.module}
                        </div>
                      </TableCell>
                      <TableCell>{score}</TableCell>
                      <TableCell>
                        <Badge variant={classificationBadgeVariant[classification]}>
                          {classificationLabels[classification]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={grade.isPublished ? "success" : "secondary"}>
                          {grade.isPublished ? "Published" : "Withheld"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            This view shows all grades for Registry staff. A student-facing view
            (built in the next step) will only show published results.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

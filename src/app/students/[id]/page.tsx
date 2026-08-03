import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeProgramme, serializeStudent } from "@/lib/serialize";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudentFormDialog } from "../_components/student-form-dialog";
import {
  enrolmentStatusBadgeVariant,
  enrolmentStatusLabels,
} from "@/lib/student-status";

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
    prisma.student.findUnique({ where: { id }, include: { programme: true } }),
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
    </div>
  );
}

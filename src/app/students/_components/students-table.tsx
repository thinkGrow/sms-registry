"use client";

import Link from "next/link";
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
import { StudentFormDialog } from "./student-form-dialog";
import {
  enrolmentStatusBadgeVariant,
  enrolmentStatusLabels,
} from "@/lib/student-status";
import type { SerializedProgramme, SerializedStudent } from "@/lib/serialize";

type StudentWithProgramme = SerializedStudent & {
  programme: SerializedProgramme;
  isOverdue: boolean;
};

export function StudentsTable({
  students,
  programmes,
}: {
  students: StudentWithProgramme[];
  programmes: SerializedProgramme[];
}) {
  if (students.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No students match these filters.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Programme</TableHead>
          <TableHead>Year</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => (
          <TableRow key={student.id}>
            <TableCell className="font-mono text-sm">
              <Link href={`/students/${student.id}`} className="hover:underline">
                {student.studentId}
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/students/${student.id}`} className="hover:underline">
                {student.fullName}
              </Link>
              <div className="text-muted-foreground text-xs">{student.email}</div>
            </TableCell>
            <TableCell>{student.programme.name}</TableCell>
            <TableCell>{student.academicYear}</TableCell>
            <TableCell className="space-x-1.5">
              <Badge variant={enrolmentStatusBadgeVariant[student.status]}>
                {enrolmentStatusLabels[student.status]}
              </Badge>
              {student.isOverdue && <Badge variant="destructive">Overdue</Badge>}
            </TableCell>
            <TableCell className="flex justify-end gap-2 text-right">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={`/students/${student.id}`} />}
              >
                Details
              </Button>
              <StudentFormDialog
                key={`${student.id}-${student.updatedAt}`}
                programmes={programmes}
                student={student}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

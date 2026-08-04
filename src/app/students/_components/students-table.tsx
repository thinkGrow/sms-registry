"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { describeDeferral } from "@/lib/balance";
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
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(studentId: string) {
    if (
      !window.confirm(
        "Delete this student? This can't be undone, and only works if they have no payments, submissions, or grades on record.",
      )
    ) {
      return;
    }
    setDeleteError(null);
    setDeletingId(studentId);
    const response = await fetch(`/api/students/${studentId}`, {
      method: "DELETE",
    });
    setDeletingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setDeleteError(body?.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  if (students.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No students match these filters.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {deleteError && <p className="text-destructive text-sm">{deleteError}</p>}
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
                <Link
                  href={`/students/${student.id}`}
                  className="hover:underline"
                >
                  {student.studentId}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/students/${student.id}`}
                  className="hover:underline"
                >
                  {student.fullName}
                </Link>
                <div className="text-muted-foreground text-xs">
                  {student.email}
                </div>
              </TableCell>
              <TableCell>{student.programme.name}</TableCell>
              <TableCell>{student.academicYear}</TableCell>
              <TableCell>
                <div className="space-x-1.5">
                  <Badge variant={enrolmentStatusBadgeVariant[student.status]}>
                    {enrolmentStatusLabels[student.status]}
                  </Badge>
                  {student.isOverdue && (
                    <Badge variant="destructive">Overdue</Badge>
                  )}
                </div>
                {student.deferredAt && (
                  <div className="text-muted-foreground mt-1 text-xs">
                    {describeDeferral(new Date(student.deferredAt))}
                  </div>
                )}
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
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(student.id)}
                  disabled={deletingId === student.id}
                >
                  {deletingId === student.id ? "Deleting..." : "Delete"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

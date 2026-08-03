"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  classifyGrade,
  classificationLabels,
  classificationBadgeVariant,
} from "@/lib/classification";

type GradeRow = {
  studentId: string;
  studentName: string;
  fileUrl: string;
  fileName: string;
  gradeId: string | null;
  score: number | null;
  isPublished: boolean;
};

export function GradesSection({
  assessmentId,
  rows,
}: {
  assessmentId: string;
  rows: GradeRow[];
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [savingFor, setSavingFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveScore(studentId: string) {
    const raw = scores[studentId];
    const score = raw !== undefined ? Number(raw) : undefined;
    if (score === undefined || Number.isNaN(score)) {
      setError("Enter a numeric score first");
      return;
    }
    setError(null);
    setSavingFor(studentId);
    const response = await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, assessmentId, score }),
    });
    setSavingFor(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.fieldErrors?.score?.[0] ?? body?.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  async function togglePublish(gradeId: string, isPublished: boolean) {
    setSavingFor(gradeId);
    await fetch(`/api/grades/${gradeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !isPublished }),
    });
    setSavingFor(null);
    router.refresh();
  }

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">No submissions to grade yet.</p>;
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Classification</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const classification = row.score !== null ? classifyGrade(row.score) : null;
            return (
              <TableRow key={row.studentId}>
                <TableCell>{row.studentName}</TableCell>
                <TableCell>
                  <a
                    href={row.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {row.fileName}
                  </a>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    max={100}
                    defaultValue={row.score ?? ""}
                    onChange={(e) =>
                      setScores((prev) => ({ ...prev, [row.studentId]: e.target.value }))
                    }
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  {classification && (
                    <Badge variant={classificationBadgeVariant[classification]}>
                      {classificationLabels[classification]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {row.gradeId && (
                    <Badge variant={row.isPublished ? "success" : "secondary"}>
                      {row.isPublished ? "Published" : "Withheld"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingFor === row.studentId}
                    onClick={() => saveScore(row.studentId)}
                  >
                    Save
                  </Button>
                  {row.gradeId && (
                    <Button
                      size="sm"
                      variant={row.isPublished ? "outline" : "default"}
                      disabled={savingFor === row.gradeId}
                      onClick={() => togglePublish(row.gradeId!, row.isPublished)}
                    >
                      {row.isPublished ? "Withhold" : "Publish"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

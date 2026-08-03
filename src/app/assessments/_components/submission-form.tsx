"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EligibleStudent = { id: string; fullName: string; studentId: string };

export function SubmissionForm({
  assessmentId,
  eligibleStudents,
}: {
  assessmentId: string;
  eligibleStudents: EligibleStudent[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError("Select a student");
      return;
    }
    if (!file) {
      setError("Choose a PDF or DOCX file");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("studentId", studentId);
    formData.append("file", file);

    const response = await fetch(`/api/assessments/${assessmentId}/submissions`, {
      method: "POST",
      body: formData,
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      return;
    }

    setFile(null);
    setStudentId("");
    router.refresh();
  }

  if (eligibleStudents.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No enrolled students in this programme to submit against.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="studentId">Student</Label>
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger id="studentId" className="w-[220px]">
            <SelectValue placeholder="Select a student">
              {(value: string) =>
                eligibleStudents.find((s) => s.id === value)?.fullName ??
                "Select a student"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {eligibleStudents.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.fullName} ({student.studentId})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">File (PDF or DOCX)</Label>
        <input
          id="file"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Uploading..." : "Submit"}
      </Button>

      {error && <p className="text-destructive w-full text-sm">{error}</p>}
    </form>
  );
}

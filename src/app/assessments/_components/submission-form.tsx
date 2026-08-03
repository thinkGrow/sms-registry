"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function SubmissionForm({
  assessmentId,
  studentId,
  hasExistingSubmission,
}: {
  assessmentId: string;
  // Students only ever submit as themselves; there's no staff "submit on
  // behalf of a student" path anymore, so this is always the current student.
  studentId: string;
  // Whether this student already has a submission on this assessment, so the
  // form can call this a resubmission (and warn that it replaces the old
  // file) rather than a first-time submission.
  hasExistingSubmission: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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
    setSuccess(
      hasExistingSubmission
        ? "Resubmitted. This replaced your previous file."
        : "Submitted."
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="file">File (PDF or DOCX)</Label>
        <input
          id="file"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setSuccess(null);
          }}
          className="text-sm"
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Uploading..." : "Submit"}
      </Button>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
    </form>
  );
}

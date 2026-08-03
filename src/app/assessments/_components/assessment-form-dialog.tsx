"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assessmentCreateSchema,
  type AssessmentCreateInput,
} from "@/lib/validations/assessment";
import type { SerializedProgramme } from "@/lib/serialize";

type Assessment = {
  id: string;
  title: string;
  module: string;
  programmeId: string;
  deadline: Date | string;
};

type AssessmentFormDialogProps = {
  programmes: SerializedProgramme[];
  assessment?: Assessment;
};

function toDatetimeLocalValue(date: Date | string) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function AssessmentFormDialog({
  programmes,
  assessment,
}: AssessmentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const isEditing = !!assessment;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AssessmentCreateInput>({
    resolver: zodResolver(assessmentCreateSchema),
    defaultValues: assessment
      ? {
          title: assessment.title,
          module: assessment.module,
          programmeId: assessment.programmeId,
          deadline: new Date(assessment.deadline),
        }
      : undefined,
  });

  async function onSubmit(values: AssessmentCreateInput) {
    setSubmitError(null);
    const url = isEditing ? `/api/assessments/${assessment.id}` : "/api/assessments";
    const method = isEditing ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setSubmitError(body?.error?.formErrors?.[0] ?? body?.error ?? "Something went wrong");
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSubmitError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button variant={isEditing ? "outline" : "default"} size={isEditing ? "sm" : "default"} />
        }
      >
        {isEditing ? "Edit" : "New Assessment"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Assessment" : "New Assessment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-destructive text-sm">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="module">Module</Label>
            <Input id="module" placeholder="e.g. Data Structures" {...register("module")} />
            {errors.module && (
              <p className="text-destructive text-sm">{errors.module.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="programmeId">Programme</Label>
            <Controller
              name="programmeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="programmeId">
                    <SelectValue placeholder="Select a programme">
                      {(value: string) =>
                        value
                          ? programmes.find((p) => p.id === value)?.name
                          : "Select a programme"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {programmes.map((programme) => (
                      <SelectItem key={programme.id} value={programme.id}>
                        {programme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.programmeId && (
              <p className="text-destructive text-sm">{errors.programmeId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Submission deadline</Label>
            <Controller
              name="deadline"
              control={control}
              render={({ field }) => (
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={field.value ? toDatetimeLocalValue(field.value) : ""}
                  onChange={(e) =>
                    field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                  }
                />
              )}
            />
            {errors.deadline && (
              <p className="text-destructive text-sm">{errors.deadline.message}</p>
            )}
          </div>

          {submitError && <p className="text-destructive text-sm">{submitError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

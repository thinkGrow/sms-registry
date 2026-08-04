"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import type { z } from "zod";
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
  studentCreateSchema,
  enrolmentStatusValues,
  type StudentCreateInput,
} from "@/lib/validations/student";
import { enrolmentStatusLabels } from "@/lib/student-status";
import { TOTAL_INSTALLMENTS } from "@/lib/balance";
import type { SerializedProgramme, SerializedStudent } from "@/lib/serialize";

type StudentFormDialogProps = {
  programmes: SerializedProgramme[];
  student?: SerializedStudent;
};

export function StudentFormDialog({
  programmes,
  student,
}: StudentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const isEditing = !!student;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof studentCreateSchema>, unknown, StudentCreateInput>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: student
      ? {
          fullName: student.fullName,
          email: student.email,
          dateOfBirth: new Date(student.dateOfBirth),
          enrolmentDate: new Date(student.enrolmentDate),
          programmeId: student.programmeId,
          academicYear: student.academicYear,
          status: student.status,
          feeOverride: student.feeOverride ?? undefined,
        }
      : {
          // A new student is being enrolled right now, so today is the
          // obvious default, still editable for a backdated entry.
          enrolmentDate: new Date(),
          status: "ENROLLED",
        },
  });

  // Academic year is capped by the selected programme's degree length (4
  // years for a Bachelor's, 2 for a Master's), same mapping balance.ts uses
  // to split fees into installments, so re-used here rather than duplicated.
  // The HTML max attribute alone only affects the input's spinner arrows,
  // not typed or pasted values, and the Zod schema has no upper bound (it
  // can't, the limit depends on which programme is selected), so this is
  // enforced directly here: an inline error the moment the typed value
  // exceeds it, and the Save button disabled, not just a server-side
  // rejection after a round trip.
  const selectedProgrammeId = useWatch({ control, name: "programmeId" });
  const selectedProgramme = programmes.find((p) => p.id === selectedProgrammeId);
  const maxAcademicYear = selectedProgramme
    ? TOTAL_INSTALLMENTS[selectedProgramme.degreeLevel]
    : undefined;
  const watchedAcademicYear = useWatch({ control, name: "academicYear" });
  const academicYearExceedsMax =
    maxAcademicYear !== undefined &&
    Number.isFinite(watchedAcademicYear) &&
    watchedAcademicYear > maxAcademicYear;

  async function onSubmit(values: StudentCreateInput) {
    setSubmitError(null);
    const url = isEditing ? `/api/students/${student.id}` : "/api/students";
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
          <Button
            variant={isEditing ? "outline" : "default"}
            size={isEditing ? "sm" : "default"}
          />
        }
      >
        {isEditing ? "Edit" : "New Student"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Student" : "New Student"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-destructive text-sm">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => (
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={
                    field.value
                      ? new Date(field.value as Date).toISOString().slice(0, 10)
                      : ""
                  }
                  onChange={(e) =>
                    field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                  }
                />
              )}
            />
            {errors.dateOfBirth && (
              <p className="text-destructive text-sm">{errors.dateOfBirth.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="enrolmentDate">Enrolment date</Label>
            <Controller
              name="enrolmentDate"
              control={control}
              render={({ field }) => (
                <Input
                  id="enrolmentDate"
                  type="date"
                  value={
                    field.value
                      ? new Date(field.value as Date).toISOString().slice(0, 10)
                      : ""
                  }
                  onChange={(e) =>
                    field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                  }
                />
              )}
            />
            {errors.enrolmentDate && (
              <p className="text-destructive text-sm">{errors.enrolmentDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="programmeId">Programme</Label>
            <Controller
              name="programmeId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="programmeId" className="w-full">
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
            <Label htmlFor="academicYear">Academic year</Label>
            <Input
              id="academicYear"
              type="number"
              min={1}
              max={maxAcademicYear}
              {...register("academicYear", { valueAsNumber: true })}
            />
            {errors.academicYear && (
              <p className="text-destructive text-sm">{errors.academicYear.message}</p>
            )}
            {academicYearExceedsMax && (
              <p className="text-destructive text-sm">
                Academic year can&apos;t exceed {maxAcademicYear} for this programme.
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              {maxAcademicYear
                ? `1–${maxAcademicYear} for this programme's degree length.`
                : "Select a programme to see its valid range."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Enrolment status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue>
                      {(value: string) =>
                        enrolmentStatusLabels[value as keyof typeof enrolmentStatusLabels]
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {enrolmentStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {enrolmentStatusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feeOverride">Fee override (optional)</Label>
            <Input
              id="feeOverride"
              type="number"
              step="0.01"
              placeholder="Leave blank to use the programme's standard fee"
              {...register("feeOverride", {
                setValueAs: (value) => (value === "" ? undefined : Number(value)),
              })}
            />
            {errors.feeOverride && (
              <p className="text-destructive text-sm">{errors.feeOverride.message}</p>
            )}
            <p className="text-muted-foreground text-xs">
              This is the total fee for the whole programme.
            </p>
          </div>

          {submitError && <p className="text-destructive text-sm">{submitError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || academicYearExceedsMax}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

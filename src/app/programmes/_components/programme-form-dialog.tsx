"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
  programmeCreateSchema,
  type ProgrammeCreateInput,
} from "@/lib/validations/programme";
import type { SerializedProgramme } from "@/lib/serialize";

const degreeLevelLabels = {
  BACHELORS: "Bachelor's",
  MASTERS: "Master's",
} as const;

type ProgrammeFormDialogProps = {
  programme?: SerializedProgramme;
};

function toDateInputValue(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function ProgrammeFormDialog({ programme }: ProgrammeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const isEditing = !!programme;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof programmeCreateSchema>, unknown, ProgrammeCreateInput>({
    resolver: zodResolver(programmeCreateSchema),
    defaultValues: programme
      ? {
          name: programme.name,
          feeAmount: programme.feeAmount,
          degreeLevel: programme.degreeLevel,
          feeDueDate: programme.feeDueDate ? new Date(programme.feeDueDate) : null,
        }
      : { degreeLevel: "BACHELORS" },
  });

  async function onSubmit(values: ProgrammeCreateInput) {
    setSubmitError(null);
    const url = isEditing ? `/api/programmes/${programme.id}` : "/api/programmes";
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
        {isEditing ? "Edit" : "New Programme"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Programme" : "New Programme"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="degreeLevel">Degree Level</Label>
            <Controller
              name="degreeLevel"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="degreeLevel">
                    <SelectValue placeholder="Select a degree level">
                      {(value: "BACHELORS" | "MASTERS") =>
                        value ? degreeLevelLabels[value] : "Select a degree level"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(degreeLevelLabels) as Array<keyof typeof degreeLevelLabels>).map(
                      (level) => (
                        <SelectItem key={level} value={level}>
                          {degreeLevelLabels[level]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.degreeLevel && (
              <p className="text-destructive text-sm">{errors.degreeLevel.message}</p>
            )}
            <p className="text-muted-foreground text-xs">
              Determines the number of fee installments: Bachelor&apos;s splits the
              fee across 4 years, Master&apos;s across 2.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feeAmount">Total Fee</Label>
            <Input
              id="feeAmount"
              type="number"
              step="0.01"
              {...register("feeAmount", { setValueAs: (value) => (value === "" ? undefined : Number(value)) })}
            />
            {errors.feeAmount && (
              <p className="text-destructive text-sm">{errors.feeAmount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="feeDueDate">Fee due date (optional)</Label>
            <Controller
              name="feeDueDate"
              control={control}
              render={({ field }) => (
                <Input
                  id="feeDueDate"
                  type="date"
                  value={field.value ? toDateInputValue(field.value as Date) : ""}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                />
              )}
            />
            {errors.feeDueDate && (
              <p className="text-destructive text-sm">{errors.feeDueDate.message}</p>
            )}
            <p className="text-muted-foreground text-xs">
              Leave blank if this programme should never flag students as overdue.
            </p>
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

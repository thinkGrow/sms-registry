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
  paymentCreateSchema,
  type PaymentCreateInput,
} from "@/lib/validations/payment";
import type { SerializedPayment } from "@/lib/serialize";

type PaymentFormDialogProps = {
  studentId: string;
  // All installment years for this student's programme, and which of them
  // already have a payment recorded, so the form only ever offers years that
  // are actually still payable (plus, when editing, the payment's own
  // current year).
  totalInstallments: number;
  installmentAmount: number;
  paidYears: number[];
  payment?: SerializedPayment;
};

export function PaymentFormDialog({
  studentId,
  totalInstallments,
  installmentAmount,
  paidYears,
  payment,
}: PaymentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const isEditing = !!payment;

  const availableYears = Array.from(
    { length: totalInstallments },
    (_, i) => i + 1,
  ).filter(
    (year) => year === payment?.installmentYear || !paidYears.includes(year),
  );

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PaymentCreateInput>({
    resolver: zodResolver(paymentCreateSchema),
    defaultValues: payment
      ? {
          studentId,
          installmentYear: payment.installmentYear ?? undefined,
          paidAt: new Date(payment.paidAt),
        }
      : { studentId },
  });

  async function onSubmit(values: PaymentCreateInput) {
    setSubmitError(null);
    const url = isEditing ? `/api/payments/${payment.id}` : "/api/payments";
    const method = isEditing ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setSubmitError(
        body?.error?.formErrors?.[0] ?? body?.error ?? "Something went wrong",
      );
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
          <Button variant={isEditing ? "outline" : "default"} size="sm" />
        }
      >
        {isEditing ? "Edit" : "Record Payment"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Payment" : "Record Payment"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="installmentYear">Year</Label>
            <Controller
              name="installmentYear"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                >
                  <SelectTrigger id="installmentYear">
                    <SelectValue placeholder="Select a year">
                      {(value: string) =>
                        value ? `Year ${value}` : "Select a year"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        Year {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.installmentYear && (
              <p className="text-destructive text-sm">
                {errors.installmentYear.message}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              ${installmentAmount.toFixed(2)} per year.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAt">Date paid</Label>
            <Controller
              name="paidAt"
              control={control}
              render={({ field }) => (
                <Input
                  id="paidAt"
                  type="date"
                  value={
                    field.value
                      ? new Date(field.value).toISOString().slice(0, 10)
                      : ""
                  }
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? new Date(e.target.value) : undefined,
                    )
                  }
                />
              )}
            />
            {errors.paidAt && (
              <p className="text-destructive text-sm">
                {errors.paidAt.message}
              </p>
            )}
          </div>

          {submitError && (
            <p className="text-destructive text-sm">{submitError}</p>
          )}

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

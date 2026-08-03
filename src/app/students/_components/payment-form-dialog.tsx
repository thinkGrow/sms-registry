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
  paymentCreateSchema,
  type PaymentCreateInput,
} from "@/lib/validations/payment";
import type { SerializedPayment } from "@/lib/serialize";

type PaymentFormDialogProps = {
  studentId: string;
  payment?: SerializedPayment;
};

export function PaymentFormDialog({ studentId, payment }: PaymentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();
  const isEditing = !!payment;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PaymentCreateInput>({
    resolver: zodResolver(paymentCreateSchema),
    defaultValues: payment
      ? { studentId, amount: payment.amount, paidAt: new Date(payment.paidAt) }
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
          <Button variant={isEditing ? "outline" : "default"} size="sm" />
        }
      >
        {isEditing ? "Edit" : "Record Payment"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Payment" : "Record Payment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-destructive text-sm">{errors.amount.message}</p>
            )}
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
                    field.value ? new Date(field.value).toISOString().slice(0, 10) : ""
                  }
                  onChange={(e) =>
                    field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                  }
                />
              )}
            />
            {errors.paidAt && (
              <p className="text-destructive text-sm">{errors.paidAt.message}</p>
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

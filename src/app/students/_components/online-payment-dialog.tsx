"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  onlinePaymentSchema,
  type OnlinePaymentInput,
} from "@/lib/validations/payment";

export function OnlinePaymentDialog({
  studentId,
  totalInstallments,
  installmentAmount,
  paidYears,
}: {
  studentId: string;
  totalInstallments: number;
  installmentAmount: number;
  paidYears: number[];
}) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const availableYears = Array.from(
    { length: totalInstallments },
    (_, i) => i + 1,
  ).filter((year) => !paidYears.includes(year));

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<OnlinePaymentInput>({
    resolver: zodResolver(onlinePaymentSchema),
  });

  async function onSubmit(values: OnlinePaymentInput) {
    setSubmitError(null);
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        installmentYear: values.installmentYear,
        paidAt: new Date(),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setSubmitError(
        body?.error?.fieldErrors?.installmentYear?.[0] ??
          body?.error ??
          "Something went wrong",
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
        render={<Button size="sm" disabled={availableYears.length === 0} />}
      >
        Make a Payment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make a Payment</DialogTitle>
          <DialogDescription>
            This is a simulated online payment for demonstration purposes, no
            real payment is processed and no card details are collected. Pick an
            unpaid year and it will be recorded immediately.
          </DialogDescription>
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

          {submitError && (
            <p className="text-destructive text-sm">{submitError}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Pay Now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

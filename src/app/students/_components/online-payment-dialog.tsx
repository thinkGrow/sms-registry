"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { onlinePaymentSchema, type OnlinePaymentInput } from "@/lib/validations/payment";

export function OnlinePaymentDialog({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OnlinePaymentInput>({ resolver: zodResolver(onlinePaymentSchema) });

  async function onSubmit(values: OnlinePaymentInput) {
    setSubmitError(null);
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        amount: values.amount,
        paidAt: new Date(),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setSubmitError(body?.error?.fieldErrors?.amount?.[0] ?? body?.error ?? "Something went wrong");
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
      <DialogTrigger render={<Button size="sm" />}>Make a Payment</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make a Payment</DialogTitle>
          <DialogDescription>
            This is a simulated online payment for demonstration purposes, no
            real payment is processed and no card details are collected. Enter
            any amount and it will be recorded immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min={0}
              autoFocus
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-destructive text-sm">{errors.amount.message}</p>
            )}
          </div>

          {submitError && <p className="text-destructive text-sm">{submitError}</p>}

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

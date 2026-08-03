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
import { PaymentFormDialog } from "./payment-form-dialog";
import { OnlinePaymentDialog } from "./online-payment-dialog";
import type { SerializedPayment } from "@/lib/serialize";
import type { StudentBalanceInfo } from "@/lib/balance";

export function PaymentsSection({
  studentId,
  payments,
  balance,
  canManage,
  canPayOnline,
}: {
  studentId: string;
  payments: SerializedPayment[];
  balance: StudentBalanceInfo;
  canManage: boolean;
  canPayOnline: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(paymentId: string) {
    if (!window.confirm("Delete this payment record? This cannot be undone.")) {
      return;
    }
    setDeletingId(paymentId);
    await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {canManage ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>
              Fee: <span className="font-medium">${balance.feeAmount.toFixed(2)}</span>
            </span>
            <span>
              Paid: <span className="font-medium">${balance.totalPaid.toFixed(2)}</span>
            </span>
            <span>
              Outstanding fees:{" "}
              <span className="font-medium">${balance.balance.toFixed(2)}</span>
            </span>
            <span>
              Installment {balance.installmentsDueByNow} of {balance.totalInstallments}
              {": "}
              <span className="font-medium">${balance.installmentAmount.toFixed(2)}</span>
              /year
            </span>
            {balance.isOverdue && (
              <Badge variant="destructive">
                Overdue (${balance.amountOwedByNow.toFixed(2)})
              </Badge>
            )}
          </div>
        ) : (
          // Students don't see their balance or overdue status, only staff
          // do; a student can still pay via "Make a Payment" without it.
          <div />
        )}
        {canManage && <PaymentFormDialog studentId={studentId} />}
        {canPayOnline && <OnlinePaymentDialog studentId={studentId} />}
      </div>

      {payments.length === 0 ? (
        <p className="text-muted-foreground text-sm">No payments recorded yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date paid</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-mono text-sm">
                  {payment.referenceNumber}
                </TableCell>
                <TableCell>${payment.amount.toFixed(2)}</TableCell>
                <TableCell>
                  {new Date(payment.paidAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                {canManage && (
                  <TableCell className="flex justify-end gap-2 text-right">
                    <PaymentFormDialog studentId={studentId} payment={payment} />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(payment.id)}
                      disabled={deletingId === payment.id}
                    >
                      {deletingId === payment.id ? "Deleting..." : "Delete"}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

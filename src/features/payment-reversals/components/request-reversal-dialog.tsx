"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PaymentContextCard } from "@/features/payments/components/payment-context-card";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/money";
import { Textarea } from "@/components/ui/textarea";
import { paisasToRupees, rupeesToPaisas } from "@/lib/format";
import { getErrorMessage } from "@/lib/trpc-error";
import type { PaymentWithCustomer } from "@/server/db/repos/payments.repo";
import { trpc } from "@/trpc/react";
import { reversibleRemainingPaisas } from "../lib";
import type { PaymentReversal } from "@/server/db/schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentWithCustomer | null;
  /** This payment's own reversals (any status) — used to compute what's still reversible. */
  existingReversals: PaymentReversal[];
};

export function RequestReversalDialog({
  open,
  onOpenChange,
  payment,
  existingReversals,
}: Props) {
  const [amountRupees, setAmountRupees] = useState(0);
  const [reason, setReason] = useState("");
  const router = useRouter();

  const requestMutation = trpc.paymentReversals.request.useMutation({
    onSuccess: (data) => {
      toast.success(`Reversal ${data.reversalNo} requested · pending review`);
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const isPending = requestMutation.isPending;

  if (!payment) return null;

  const remainingPaisas = reversibleRemainingPaisas(payment, existingReversals);
  const remainingRupees = paisasToRupees(remainingPaisas);
  const requestedPaisas = rupeesToPaisas(amountRupees);
  const afterPaisas = remainingPaisas - requestedPaisas;
  const canSubmit =
    !isPending &&
    requestedPaisas > 0n &&
    requestedPaisas <= remainingPaisas &&
    reason.trim().length >= 3;

  function handleSubmit() {
    if (!payment || !canSubmit) return;
    requestMutation.mutate({
      paymentId: payment.id,
      amountRupees,
      reason,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request reversal</DialogTitle>
          <DialogDescription>
            An admin will review this request before anything changes on the
            customer&apos;s balance.
          </DialogDescription>
        </DialogHeader>

        <PaymentContextCard payment={payment} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="reversal-amount" className="text-sm">
              Amount to reverse (Rs.)
            </Label>
            <button
              type="button"
              className="text-primary text-xs font-medium hover:underline"
              onClick={() => setAmountRupees(remainingRupees)}
              disabled={isPending || remainingRupees <= 0}
            >
              Reverse full amount
            </button>
          </div>
          <AmountInput
            id="reversal-amount"
            value={amountRupees}
            onChange={setAmountRupees}
            max={remainingRupees}
            disabled={isPending}
          />
          <p className="text-muted-foreground text-xs">
            <Money paisas={payment.amountPaisas} /> paid ·{" "}
            <Money paisas={remainingPaisas} /> still reversible
          </p>
          {requestedPaisas > 0n ? (
            <p className="text-muted-foreground text-xs">
              Remaining after this reversal: <Money paisas={afterPaisas} />
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="reversal-reason" className="text-sm">
            Reason
          </Label>
          <Textarea
            id="reversal-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Client sent Rs 2,000 more than intended"
            disabled={isPending}
          />
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? "Requesting…" : "Request reversal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

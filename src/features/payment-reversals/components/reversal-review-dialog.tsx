"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { fmtDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/trpc-error";
import type { ReversalWithContext } from "@/server/db/repos/payment-reversals.repo";
import { trpc } from "@/trpc/react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reversal: ReversalWithContext | null;
};

type Mode = "review" | "reject";

export function ReversalReviewDialog({ open, onOpenChange, reversal }: Props) {
  // Parent passes a fresh `key` per reversal, so this re-mounts and local
  // state starts clean — no reset effect needed.
  const [mode, setMode] = useState<Mode>("review");
  const [rejectReason, setRejectReason] = useState("");
  const router = useRouter();

  const approveMutation = trpc.paymentReversals.approve.useMutation({
    onSuccess: () => {
      toast.success("Reversal approved");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const rejectMutation = trpc.paymentReversals.reject.useMutation({
    onSuccess: () => {
      toast.success("Reversal rejected");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const isPending = approveMutation.isPending || rejectMutation.isPending;

  if (!reversal) return null;

  function handleApprove() {
    if (!reversal) return;
    approveMutation.mutate({ id: reversal.id });
  }

  function handleReject() {
    if (!reversal) return;
    rejectMutation.mutate({ id: reversal.id, reason: rejectReason });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review reversal request</DialogTitle>
          <DialogDescription>
            Approve to credit the customer, or reject with a reason.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold">
                {reversal.customerName}
              </div>
              <div className="text-muted-foreground text-xs">
                {reversal.reversalNo} · against {reversal.payId} ·{" "}
                {fmtDate(reversal.requestedAt as unknown as string)}
              </div>
            </div>
            <Money
              paisas={reversal.amountPaisas}
              className="text-xl font-bold"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              of <Money paisas={reversal.paymentAmountPaisas} /> paid
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            &quot;{reversal.reason}&quot;
          </p>
        </div>

        {mode === "reject" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="reversal-reject-reason" className="text-sm">
              Reason for rejection
            </Label>
            <Textarea
              id="reversal-reject-reason"
              rows={2}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Amount doesn't match the bank statement"
            />
          </div>
        ) : null}

        <DialogFooter className="mt-2">
          {mode === "review" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("reject")}
                disabled={isPending}
              >
                <CircleX className="size-4" />
                Reject
              </Button>
              <Button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
              >
                <CircleCheck className="size-4" />
                {isPending ? "Approving…" : "Approve"}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("review")}
                disabled={isPending}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleReject}
                disabled={isPending || rejectReason.trim().length < 3}
              >
                {isPending ? "Rejecting…" : "Confirm reject"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

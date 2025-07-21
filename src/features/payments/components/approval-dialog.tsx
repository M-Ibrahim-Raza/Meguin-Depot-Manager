"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import { getErrorMessage } from "@/lib/trpc-error";
import type { PaymentWithCustomer } from "@/server/db/repos/payments.repo";
import { trpc } from "@/trpc/react";
import { PaymentContextCard } from "./payment-context-card";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentWithCustomer | null;
};

type Mode = "review" | "reject";

export function ApprovalDialog({ open, onOpenChange, payment }: Props) {
  // Parent passes a fresh `key` for each payment, so this component
  // re-mounts and local state starts clean — no reset effect needed.
  const [mode, setMode] = useState<Mode>("review");
  const [reason, setReason] = useState("");
  const [remark, setRemark] = useState("");
  const router = useRouter();

  const approveMutation = trpc.payments.approve.useMutation({
    onSuccess: () => {
      toast.success("Payment approved");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const rejectMutation = trpc.payments.reject.useMutation({
    onSuccess: () => {
      toast.success("Payment rejected");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const isPending = approveMutation.isPending || rejectMutation.isPending;

  if (!payment) return null;

  function handleApprove() {
    if (!payment) return;
    approveMutation.mutate({
      id: payment.id,
      remark: remark.trim() || undefined,
    });
  }

  function handleReject() {
    if (!payment) return;
    rejectMutation.mutate({
      id: payment.id,
      reason,
      remark: remark.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review payment</DialogTitle>
          <DialogDescription>
            Approve to credit the customer, or reject with a reason.
          </DialogDescription>
        </DialogHeader>

        <PaymentContextCard payment={payment} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="admin-remark" className="text-sm">
            Admin remark{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="admin-remark"
            rows={2}
            maxLength={500}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Optional note for your own or the team's records"
            disabled={isPending}
          />
        </div>

        {mode === "reject" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="reject-reason" className="text-sm">
              Reason for rejection
            </Label>
            <Textarea
              id="reject-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Payment not found in bank statement"
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
                disabled={isPending || reason.trim().length < 3}
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

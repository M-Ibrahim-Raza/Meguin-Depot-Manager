"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Money } from "@/components/money";
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
import type { Bill } from "@/server/db/schema";
import { trpc } from "@/trpc/react";
import { BillDetailSheet } from "./bill-detail-sheet";
import { BillStatusBadge } from "./bill-status-badge";

type BillWithCustomer = {
  bill: Bill;
  customerName: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BillWithCustomer | null;
};

type Mode = "review" | "reject";

export function BillApprovalDialog({ open, onOpenChange, data }: Props) {
  const [mode, setMode] = useState<Mode>("review");
  const [reason, setReason] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const router = useRouter();

  const approveMutation = trpc.bills.approve.useMutation({
    onSuccess: () => {
      toast.success("Bill approved");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const rejectMutation = trpc.bills.reject.useMutation({
    onSuccess: () => {
      toast.success("Bill rejected");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setMode("review");
      setReason("");
      setDetailOpen(false);
    }
    onOpenChange(isOpen);
  }

  if (!data) return null;

  const { bill, customerName } = data;

  function handleApprove() {
    approveMutation.mutate({ billId: bill.id });
  }

  function handleReject() {
    rejectMutation.mutate({
      billId: bill.id,
      reason: reason.trim() || undefined,
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review bill</DialogTitle>
            <DialogDescription>
              Approve to proceed with the bill, or reject with an optional
              reason.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{customerName}</div>
                <div className="text-muted-foreground text-xs">
                  {bill.billNo} · {fmtDate(bill.date)}
                </div>
              </div>
              <Money paisas={bill.amountPaisas} className="text-xl font-bold" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BillStatusBadge status="pending_approval" />
              {bill.note ? (
                <span className="text-muted-foreground text-xs">
                  {bill.note}
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto w-fit p-0 text-xs"
              onClick={() => setDetailOpen(true)}
            >
              View full bill
            </Button>
          </div>

          {mode === "reject" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="reject-reason" className="text-sm">
                Reason for rejection (optional)
              </Label>
              <Textarea
                id="reject-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Out of stock, customer request, etc."
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
                  disabled={isPending}
                >
                  {isPending ? "Rejecting…" : "Confirm reject"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BillDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        target={{ billId: bill.id, customerId: bill.customerId }}
      />
    </>
  );
}

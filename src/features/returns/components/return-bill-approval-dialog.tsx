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
import { BillDetailSheet } from "@/features/bills/components/bill-detail-sheet";
import { BillStatusBadge } from "@/features/bills/components/bill-status-badge";
import { fmtDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/trpc-error";
import type { ReturnBillWithCreator } from "@/server/db/repos/customers.repo";
import { trpc } from "@/trpc/react";

type ReturnBillWithCustomer = {
  bill: ReturnBillWithCreator;
  customerName: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReturnBillWithCustomer | null;
};

type Mode = "review" | "reject";

export function ReturnBillApprovalDialog({ open, onOpenChange, data }: Props) {
  const [mode, setMode] = useState<Mode>("review");
  const [reason, setReason] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const router = useRouter();

  const approveMutation = trpc.returns.approve.useMutation({
    onSuccess: () => {
      toast.success("Return bill approved");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const rejectMutation = trpc.returns.reject.useMutation({
    onSuccess: () => {
      toast.success("Return bill rejected");
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
            <DialogTitle>Review return bill</DialogTitle>
            <DialogDescription>
              Approve to credit the customer, or reject to reverse the restock.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{customerName}</div>
                <div className="text-muted-foreground text-xs">
                  {bill.billNo} · {fmtDate(bill.date)}
                  {bill.createdByName ? ` · by ${bill.createdByName}` : ""}
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
              <Label htmlFor="reject-return-reason" className="text-sm">
                Reason for rejection (optional)
              </Label>
              <Textarea
                id="reject-return-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Item not eligible, customer withdrew request, etc."
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

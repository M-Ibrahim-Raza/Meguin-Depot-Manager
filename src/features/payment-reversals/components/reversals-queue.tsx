"use client";

import { Undo2 } from "lucide-react";
import { useState } from "react";
import type { ReversalWithContext } from "@/server/db/repos/payment-reversals.repo";
import { ReversalRequestRow } from "./reversal-request-row";
import { ReversalReviewDialog } from "./reversal-review-dialog";

type Props = {
  reversals: ReversalWithContext[];
};

export function ReversalsQueue({ reversals }: Props) {
  const [reviewing, setReviewing] = useState<ReversalWithContext | null>(null);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Reversal Requests</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Payments a user has asked to have partially or fully reversed,
          awaiting your review.
        </p>
      </div>

      {reversals.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Undo2 className="size-8" />
          <p className="text-sm">No reversal requests are pending review.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reversals.map((r) => (
            <ReversalRequestRow
              key={r.id}
              reversal={r}
              onReview={setReviewing}
            />
          ))}
        </div>
      )}

      <ReversalReviewDialog
        key={reviewing?.id ?? "closed"}
        open={!!reviewing}
        onOpenChange={(o) => !o && setReviewing(null)}
        reversal={reviewing}
      />
    </div>
  );
}

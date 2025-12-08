import { ApprovalBadge } from "@/components/approval-badge";
import { Money } from "@/components/money";
import { cn } from "@/lib/utils";

type Props = {
  /** The payment's own total amount. */
  amountPaisas: bigint;
  /** Sum of this payment's approved reversals — 0 if none. */
  reversedApprovedPaisas: bigint;
  /** Whether a reversal request against this payment still awaits review. */
  hasPendingReversal: boolean;
  className?: string;
};

/**
 * "Rs 2,000 of Rs 5,000 reversed · Rs 3,000 remaining" + a pending-review
 * hint, shown on a payment row. Renders nothing when there's no reversal
 * activity to report, so it costs nothing on the vast majority of rows.
 */
export function ReversalStatusLine({
  amountPaisas,
  reversedApprovedPaisas,
  hasPendingReversal,
  className,
}: Props) {
  if (reversedApprovedPaisas <= 0n && !hasPendingReversal) return null;

  const remainingPaisas = amountPaisas - reversedApprovedPaisas;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {reversedApprovedPaisas > 0n ? (
        <span className="text-muted-foreground text-xs">
          <Money paisas={reversedApprovedPaisas} /> of{" "}
          <Money paisas={amountPaisas} /> reversed ·{" "}
          <Money paisas={remainingPaisas} /> remaining
        </span>
      ) : null}
      {hasPendingReversal ? (
        <ApprovalBadge approval="pending" className="text-[10px]" />
      ) : null}
    </div>
  );
}

import { BillRow } from "@/features/customers/components/customer-detail/bill-row";
import { ReturnBillRow } from "@/features/returns/components/return-bill-row";
import type { BillWithCustomer } from "@/server/db/repos/bills.repo";

type Props = {
  bill: BillWithCustomer;
  canApprove: boolean;
  onApprove: (bill: BillWithCustomer) => void;
};

/**
 * A single row on the global Bills page. Dispatches to the sale-bill or
 * return-bill row (and, on approval, the matching dialog via `onApprove`)
 * based on `bill.direction` — sale and return bills have separate approval
 * mutations (`bills.approve/reject` vs `returns.approve/reject`).
 */
export function GlobalBillRow({ bill, canApprove, onApprove }: Props) {
  const customerLabel = bill.customerArea
    ? `${bill.customerName} · ${bill.customerArea}`
    : bill.customerName;
  const onApproveClick =
    bill.status === "pending_approval" ? () => onApprove(bill) : undefined;

  if (bill.direction === "return") {
    return (
      <ReturnBillRow
        bill={{ ...bill, createdByName: null }}
        canApprove={canApprove}
        onApproveClick={onApproveClick}
        customerLabel={customerLabel}
      />
    );
  }
  return (
    <BillRow
      bill={bill}
      canApprove={canApprove}
      onApproveClick={onApproveClick}
      customerLabel={customerLabel}
    />
  );
}

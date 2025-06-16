import { Money } from "@/components/money";
import type { BusinessInfo } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Bill, BillItem, Customer } from "@/server/db/schema";

type Props = {
  title: string;
  /** Render as a return/credit note rather than a sale bill. */
  isReturn?: boolean;
  bill: Bill;
  customer: Customer;
  items: BillItem[];
  business: BusinessInfo;
  /** Authoritative stored total — not re-summed from items. */
  grandTotalPaisas: bigint;
  /** Adds a dashed cut/fold divider on the right edge (between columns). */
  divider?: boolean;
};

/** qty is a numeric string (e.g. "2.500"); strip trailing zeros for display. */
function fmtQty(qty: string): string {
  return Number(qty).toString();
}

/** Per-line total in paisas; mirrors lineTotalPaisas in the bills router. */
function lineTotalPaisas(qty: string, unitPricePaisas: bigint): bigint {
  return BigInt(Math.round(Number(qty) * Number(unitPricePaisas)));
}

export function BillCopy({
  title,
  isReturn = false,
  bill,
  customer,
  items,
  business,
  grandTotalPaisas,
  divider,
}: Props) {
  return (
    <div
      className={cn(
        "flex min-h-[92mm] break-inside-avoid flex-col px-3 text-[10px] leading-tight text-black",
        divider && "border-b border-dashed border-black",
      )}
    >
      {/* Business identity (text-only) */}
      <div className="text-center">
        <div className="text-sm font-bold tracking-tight">{business.name}</div>
      </div>

      {/* Copy title */}
      <div className="mt-1 border-y border-black py-0.5 text-center text-[11px] font-semibold uppercase">
        {title}
      </div>

      {/* Bill metadata */}
      <div className="mt-1.5 flex flex-col gap-0.5">
        <div className="flex justify-between">
          <span>
            {isReturn ? "Return #" : "Bill #"}
            <span className="font-semibold">{bill.billNo}</span>
          </span>
          <span>{fmtDate(bill.date)}</span>
        </div>
        <div className="font-semibold">{customer.name}</div>
        {(customer.area || customer.phone) && (
          <div className="text-[9px]">
            {[customer.area, customer.phone].filter(Boolean).join(" · ")}
          </div>
        )}
        {customer.referral ? (
          <div className="text-[9px]">Referral: {customer.referral}</div>
        ) : null}
        <div className="flex justify-between text-[9px] capitalize">
          {isReturn ? (
            <span>Credit Note</span>
          ) : (
            <>
              <span>Type: {bill.type}</span>
              <span>Status: {bill.status}</span>
            </>
          )}
        </div>
      </div>

      {/* Line items */}
      <table className="mt-1.5 w-full border-collapse">
        <thead>
          <tr className="font-semibold">
            <th className="border border-black px-1 py-0.5 text-left">Item</th>
            <th className="border border-black px-1 py-0.5 text-right">
              Packing
            </th>
            <th className="border border-black px-1 py-0.5 text-right">Qty</th>
            <th className="border border-black px-1 py-0.5 text-right">Rate</th>
            <th className="border border-black px-1 py-0.5 text-right">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="break-inside-avoid align-top">
              <td className="border border-black px-1 py-0.5">
                {it.nameSnapshot}
              </td>
              <td className="border border-black px-1 py-0.5 text-right">
                {it.unitSnapshot}
              </td>
              <td className="border border-black px-1 py-0.5 text-right tabular-nums">
                {fmtQty(it.qty)}
              </td>
              <td className="border border-black px-1 py-0.5 text-right">
                <Money paisas={it.unitPricePaisas} />
              </td>
              <td className="border border-black px-1 py-0.5 text-right">
                <Money paisas={lineTotalPaisas(it.qty, it.unitPricePaisas)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Grand total */}
      <div className="mt-1 flex items-center justify-between border-t-2 border-black pt-1 font-bold">
        <span>Total</span>
        <Money paisas={grandTotalPaisas} />
      </div>

      {bill.note ? (
        <div className="mt-1 text-[9px] italic">Note: {bill.note}</div>
      ) : null}

      {/* Signature lines, pinned to the bottom */}
      <div className="mt-auto flex justify-between gap-6 pt-6 pb-3">
        <div className="flex-1 border-t border-black pt-0.5 text-center text-[9px]">
          Received by
        </div>
        <div className="flex-1 border-t border-black pt-0.5 text-center text-[9px]">
          Authorized Signature
        </div>
      </div>
    </div>
  );
}

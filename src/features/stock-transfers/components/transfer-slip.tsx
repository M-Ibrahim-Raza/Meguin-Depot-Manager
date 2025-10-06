import { transferRouteLabel } from "@/features/stock-transfers/lib";
import type { BusinessInfo, StockLocation } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StockTransfer, StockTransferItem } from "@/server/db/schema";

/** qty is a numeric string (e.g. "2.500"); strip trailing zeros for display. */
function fmtQty(qty: string): string {
  return Number(qty).toString();
}

type Props = {
  title: string;
  transfer: StockTransfer;
  items: StockTransferItem[];
  createdByName: string | null;
  business: BusinessInfo;
  /** Adds a dashed cut/fold divider between stacked copies. */
  divider?: boolean;
};

/**
 * A printable transfer slip copy. Carries NO monetary amount — a transfer just
 * relocates stock. Issued under the creating worker's name.
 */
export function TransferSlip({
  title,
  transfer,
  items,
  createdByName,
  business,
  divider,
}: Props) {
  return (
    <div
      className={cn(
        "flex min-h-[92mm] break-inside-avoid flex-col px-3 text-[10px] leading-tight text-black",
        divider && "border-b border-dashed border-black",
      )}
    >
      {/* Business identity */}
      <div className="text-center">
        <div className="text-sm font-bold tracking-tight">{business.name}</div>
      </div>

      {/* Slip title */}
      <div className="mt-1 border-y border-black py-0.5 text-center text-[11px] font-semibold uppercase">
        {title}
      </div>

      {/* Transfer metadata */}
      <div className="mt-1.5 flex flex-col gap-0.5">
        <div className="flex justify-between">
          <span>
            Slip #<span className="font-semibold">{transfer.slipNo}</span>
          </span>
          <span>{fmtDate(transfer.date)}</span>
        </div>
        <div className="font-semibold">
          {transferRouteLabel(
            transfer.fromLocation as StockLocation,
            transfer.toLocation as StockLocation,
          )}
        </div>
        <div className="text-[9px]">Issued by: {createdByName ?? "—"}</div>
      </div>

      {/* Line items — quantity only, no price */}
      <table className="mt-1.5 w-full border-collapse">
        <thead>
          <tr className="font-semibold">
            <th className="border border-black px-1 py-0.5 text-left">Item</th>
            <th className="border border-black px-1 py-0.5 text-right">Qty</th>
            <th className="border border-black px-1 py-0.5 text-left">Unit</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="break-inside-avoid align-top">
              <td className="border border-black px-1 py-0.5">
                {it.nameSnapshot}
              </td>
              <td className="border border-black px-1 py-0.5 text-right tabular-nums">
                {fmtQty(it.qty)}
              </td>
              <td className="border border-black px-1 py-0.5">
                {it.unitSnapshot}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {transfer.note ? (
        <div className="mt-1 text-[9px] italic">Note: {transfer.note}</div>
      ) : null}

      {/* Signature lines, pinned to the bottom */}
      <div className="mt-auto flex justify-between gap-6 pt-6 pb-3">
        <div className="flex-1 border-t border-black pt-0.5 text-center text-[9px]">
          Dispatched by
        </div>
        <div className="flex-1 border-t border-black pt-0.5 text-center text-[9px]">
          Received by
        </div>
      </div>
    </div>
  );
}

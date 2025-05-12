"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtQty } from "@/features/stock/lib";
import { STOCK_LOCATION_LABELS, type StockLocation } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import type { StockMovementListRow } from "@/server/db/repos/stock.repo";
import { MovementKindBadge, QtyDelta } from "./movement-display";

/** Presentational activity-log table — receives the flattened, already-filtered rows. */
export function MovementsTable({ items }: { items: StockMovementListRow[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Change</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Ref</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-muted-foreground">
                {fmtDate(m.createdAt)}
              </TableCell>
              <TableCell className="font-medium">{m.name}</TableCell>
              <TableCell>
                <MovementKindBadge kind={m.kind} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {STOCK_LOCATION_LABELS[m.location as StockLocation] ??
                  m.location}
              </TableCell>
              <TableCell className="text-right">
                <QtyDelta value={m.qtyDelta} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtQty(m.balanceAfter)}
              </TableCell>
              <TableCell>
                {m.billNo && m.billCustomerId ? (
                  <Link
                    href={`/customers/${m.billCustomerId}/bills/${m.billId}/print`}
                    className="text-primary hover:underline"
                  >
                    {m.billNo}
                  </Link>
                ) : m.transferId ? (
                  <Link
                    href={`/stock/transfers/${m.transferId}/print`}
                    className="text-primary hover:underline"
                  >
                    Transfer
                  </Link>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-40 truncate">
                {m.note ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {m.createdByName ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

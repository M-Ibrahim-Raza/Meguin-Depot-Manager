"use client";

import {
  ArrowLeftRight,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  filterTransfers,
  transferRouteLabel,
} from "@/features/stock-transfers/lib";
import { fmtQty } from "@/features/stock/lib";
import { fmtDate } from "@/lib/format";
import type { TransferListRow } from "@/server/db/repos/stock-transfers.repo";
import { trpc } from "@/trpc/react";

type Props = {
  initialRows: TransferListRow[];
};

export function TransferList({ initialRows }: Props) {
  const { data: rows = initialRows } = trpc.stockTransfers.list.useQuery(
    undefined,
    { initialData: initialRows },
  );
  const [search, setSearch] = useState("");

  const visible = useMemo(() => filterTransfers(rows, search), [rows, search]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stock Transfers</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {visible.length === rows.length
              ? `${rows.length} transfer${rows.length === 1 ? "" : "s"}`
              : `Showing ${visible.length} of ${rows.length} transfers`}
          </p>
        </div>
        <Link href="/stock/transfers/new" className={buttonVariants()}>
          <Plus className="size-4" />
          New transfer
        </Link>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setSearch("")}
          placeholder="Search by slip number, location, note, or worker…"
          aria-label="Search transfers"
          className="pr-8 pl-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <ArrowLeftRight className="size-8" />
          <p className="text-sm">
            {rows.length === 0
              ? "No transfers yet. Move stock between the warehouse and office to record one."
              : "No transfers match your search."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slip #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.slipNo}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtDate(t.date)}
                  </TableCell>
                  <TableCell>
                    {transferRouteLabel(t.fromLocation, t.toLocation)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {t.itemCount} · {fmtQty(t.totalQty)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.createdByName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <RowActions transferId={t.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function RowActions({ transferId }: { transferId: number }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Transfer actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={
            <Link href={`/stock/transfers/${transferId}/print`}>
              <Printer className="size-4" />
              View / print slip
            </Link>
          }
        />
        <DropdownMenuItem
          render={
            <Link href={`/stock/transfers/new?reverse=${transferId}`}>
              <Undo2 className="size-4" />
              Reverse this transfer
            </Link>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

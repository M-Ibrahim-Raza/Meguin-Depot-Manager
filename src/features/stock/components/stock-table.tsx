"use client";

import {
  Boxes,
  Package,
  ScrollText,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { ExportButton } from "@/features/export/components/export-button";
import { ExportFilterSelect } from "@/features/export/components/export-filter-select";
import type { StockListRow } from "@/server/db/repos/stock.repo";
import type { ExportColumnMeta } from "@/server/export/types";
import { trpc } from "@/trpc/react";
import { ReorderLevelDialog } from "./reorder-level-dialog";
import {
  StockMovementDialog,
  type MovementMode,
} from "./stock-movement-dialog";
import { StockHistorySheet } from "./stock-history-sheet";
import { StockTableBody } from "./stock-table-body";
import { StockTableHeader } from "./stock-table-header";
import { useStockTable } from "./use-stock-table";

type Props = {
  initialRows: StockListRow[];
  canManage: boolean;
  exportColumns?: ExportColumnMeta[];
};

export function StockTable({ initialRows, canManage, exportColumns }: Props) {
  const { data: rows = initialRows } = trpc.stock.list.useQuery(undefined, {
    initialData: initialRows,
  });

  const {
    search,
    setSearch,
    category,
    setCategory,
    lowOnly,
    setLowOnly,
    sort,
    toggleSort,
    categories,
    visible,
    lowCount,
  } = useStockTable(rows);

  // Mounted-through-close dialog state (keeps the target during exit animation).
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementMode, setMovementMode] = useState<MovementMode>("add");
  const [target, setTarget] = useState<StockListRow | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  function openMovement(row: StockListRow, mode: MovementMode) {
    setTarget(row);
    setMovementMode(mode);
    setMovementOpen(true);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stock</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {visible.length === rows.length
              ? `${rows.length} product${rows.length === 1 ? "" : "s"}`
              : `Showing ${visible.length} of ${rows.length} products`}
            {lowCount > 0 ? ` · ${lowCount} need attention` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && exportColumns ? (
            <ExportButton
              resource="stock"
              title="Stock"
              columns={exportColumns}
              initialFilters={{
                search,
                category,
                lowOnly: String(lowOnly),
              }}
              renderFilters={({ filters, setFilter }) => (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ExportFilterSelect
                    label="Category"
                    icon={Boxes}
                    value={
                      filters.category === "All"
                        ? "all"
                        : (filters.category ?? "all")
                    }
                    onChange={(v) =>
                      setFilter("category", v === "all" ? "All" : v)
                    }
                    options={categories.filter((c) => c !== "All")}
                    optionLabels={Object.fromEntries(
                      categories.map((c) => [c, c]),
                    )}
                    allLabel="All categories"
                  />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium">Low stock</span>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        filters.lowOnly === "true" ? "default" : "outline"
                      }
                      onClick={() =>
                        setFilter(
                          "lowOnly",
                          filters.lowOnly === "true" ? "false" : "true",
                        )
                      }
                    >
                      <SlidersHorizontal className="size-3.5" />
                      Low only
                    </Button>
                  </div>
                </div>
              )}
            />
          ) : null}
          <Link
            href="/stock/movements"
            className={buttonVariants({ variant: "outline" })}
          >
            <ScrollText className="size-4" />
            Activity log
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setSearch("")}
          placeholder="Search by name, article number, or category…"
          aria-label="Search stock"
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

      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={category === c ? "default" : "outline"}
            onClick={() => setCategory(c)}
          >
            {c}
          </Button>
        ))}
        <span className="bg-border mx-1 h-5 w-px" aria-hidden />
        <Button
          size="sm"
          variant={lowOnly ? "default" : "outline"}
          onClick={() => setLowOnly((v) => !v)}
        >
          <SlidersHorizontal className="size-3.5" />
          Low only
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Package className="size-8" />
          <p className="text-sm">
            {rows.length === 0
              ? "No products yet. Add products from the Products page."
              : "No products match the current filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <StockTableHeader sort={sort} toggleSort={toggleSort} />
            <StockTableBody
              rows={visible}
              canManage={canManage}
              onMovement={openMovement}
              onReorder={(r) => {
                setTarget(r);
                setReorderOpen(true);
              }}
              onHistory={(r) => {
                setTarget(r);
                setHistoryOpen(true);
              }}
            />
          </Table>
        </div>
      )}

      {target ? (
        <>
          <StockMovementDialog
            open={movementOpen}
            onOpenChange={setMovementOpen}
            mode={movementMode}
            target={target}
          />
          <ReorderLevelDialog
            open={reorderOpen}
            onOpenChange={setReorderOpen}
            target={target}
          />
          <StockHistorySheet
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            target={target}
          />
        </>
      ) : null}
    </div>
  );
}

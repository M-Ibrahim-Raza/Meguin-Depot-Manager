"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ResourceKey } from "@/server/export/datasets";
import {
  EXPORT_FORMATS,
  type ExportColumnMeta,
  type ExportFormat,
} from "@/server/export/types";
import { useExport } from "../hooks/use-export";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  xlsx: "Excel",
  csv: "CSV",
  pdf: "PDF",
  json: "JSON",
};

// Show Excel/CSV/PDF/JSON in a sensible order regardless of the enum order.
const FORMAT_ORDER: ExportFormat[] = ["xlsx", "csv", "pdf", "json"];

export type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: ResourceKey;
  /** Heading + the dataset's display name (e.g. "Payments"). */
  title: string;
  /** Available columns + their default-selected state, from the server registry. */
  columns: ExportColumnMeta[];
  /** Filters inherited from the page (applied as-is, not shown). */
  initialFilters?: Record<string, string>;
  /** Render an inline date-range control bound to `dateFrom`/`dateTo`. */
  showDateRange?: boolean;
  /** Label for the date-range control (e.g. "Date added" for customers). */
  dateRangeLabel?: string;
  /** Extra, resource-specific filter controls (e.g. status/customer pickers). */
  renderFilters?: (args: {
    filters: Record<string, string>;
    setFilter: (key: string, value: string) => void;
  }) => React.ReactNode;
};

export function ExportDialog({
  open,
  onOpenChange,
  resource,
  title,
  columns,
  initialFilters,
  showDateRange = false,
  dateRangeLabel = "Date range",
  renderFilters,
}: ExportDialogProps) {
  const { isPending, download } = useExport();

  // The parent remounts this component on open (via `key`), so initializing
  // state from props here gives a fresh form each time the dialog opens.
  const [format, setFormat] = React.useState<ExportFormat>("xlsx");
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(columns.filter((c) => c.default).map((c) => c.key)),
  );
  const [filters, setFilters] = React.useState<Record<string, string>>(() => ({
    ...(initialFilters ?? {}),
  }));

  const availableFormats = FORMAT_ORDER.filter((f) =>
    EXPORT_FORMATS.includes(f),
  );

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleColumn(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleExport() {
    const params = new URLSearchParams();
    params.set("format", format);

    const orderedKeys = columns
      .filter((c) => selected.has(c.key))
      .map((c) => c.key);
    if (orderedKeys.length !== columns.length) {
      params.set("cols", orderedKeys.join(","));
    }
    for (const [key, value] of Object.entries(filters)) {
      if (value && value !== "all") params.set(key, value);
    }

    void download(`/api/export/${resource}?${params.toString()}`).then((ok) => {
      if (ok) onOpenChange(false);
    });
  }

  const noColumns = selected.size === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export {title}</DialogTitle>
          <DialogDescription>
            Choose a format and columns. Filters applied on this page are
            included.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Format</Label>
            <div className="flex flex-wrap gap-2">
              {availableFormats.map((f) => (
                <Button
                  key={f}
                  type="button"
                  size="sm"
                  variant={format === f ? "default" : "outline"}
                  onClick={() => setFormat(f)}
                >
                  {FORMAT_LABELS[f]}
                </Button>
              ))}
            </div>
          </div>

          {showDateRange ? (
            <div className="flex flex-col gap-2">
              <Label>{dateRangeLabel}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.dateFrom ?? ""}
                  onChange={(e) => setFilter("dateFrom", e.target.value)}
                  aria-label="From date"
                />
                <Input
                  type="date"
                  value={filters.dateTo ?? ""}
                  onChange={(e) => setFilter("dateTo", e.target.value)}
                  aria-label="To date"
                />
              </div>
            </div>
          ) : null}

          {renderFilters ? renderFilters({ filters, setFilter }) : null}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Columns</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground text-xs"
                  onClick={() =>
                    setSelected(new Set(columns.map((c) => c.key)))
                  }
                >
                  Select all
                </button>
                <span className="text-muted-foreground text-xs">·</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground text-xs"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {columns.map((c) => {
                const on = selected.has(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleColumn(c.key)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition-colors",
                      on
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-input text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isPending || noColumns}
          >
            {isPending ? "Exporting…" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

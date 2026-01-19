"use client";

import { ArrowLeftRight, CircleCheck, User } from "lucide-react";
import * as React from "react";
import { FilterSelectValue } from "@/components/ui/filter-select-value";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { BILL_STATUSES, BILL_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/features/export/components/export-button";
import { ExportFilterSelect } from "@/features/export/components/export-filter-select";
import type { BillFilters } from "@/features/bills/lib";
import type { Button } from "@/components/ui/button";
import type { ExportColumnMeta } from "@/server/export/types";

const DIRECTION_OPTIONS = ["sale", "return"] as const;
const DIRECTION_LABELS: Record<(typeof DIRECTION_OPTIONS)[number], string> = {
  sale: "Sale",
  return: "Return",
};

type Props = {
  columns: ExportColumnMeta[];
  /** Provide for the global export (renders a customer picker). */
  customers?: { id: number; name: string }[];
  /** Provide to scope the export to a single customer (hides the picker). */
  customerId?: number;
  /**
   * Lock the export to one direction (e.g. "return" from the Return Bills tab).
   * Hides the Direction picker; also hides Status when locked to "return", since
   * return bills are always created with status "paid" (see createReturnBillTx),
   * so any other status option could only ever produce an empty export.
   */
  lockDirection?: "sale" | "return";
  /** Seed the export dialog from the page's current on-screen filters (e.g. the global Bills page). `customerId`/`lockDirection` above still take precedence. */
  initialFilters?: Partial<BillFilters>;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
};

/** Export trigger for bills, with bill-specific filter controls in the dialog. */
export function BillsExportButton({
  columns,
  customers,
  customerId,
  lockDirection,
  initialFilters,
  label = "Export",
  variant = "outline",
  size,
}: Props) {
  const scopedToCustomer = customerId != null;
  const showStatus = lockDirection !== "return";
  const showDirection = !lockDirection;

  const mergedInitialFilters: Record<string, string> = {};
  for (const [key, value] of Object.entries(initialFilters ?? {})) {
    if (value && value !== "all") mergedInitialFilters[key] = value;
  }
  if (scopedToCustomer) mergedInitialFilters.customerId = String(customerId);
  if (lockDirection) mergedInitialFilters.direction = lockDirection;

  return (
    <ExportButton
      resource="bills"
      title={lockDirection === "return" ? "Return Bills" : "Bills"}
      columns={columns}
      label={label}
      variant={variant}
      size={size}
      initialFilters={mergedInitialFilters}
      showDateRange
      renderFilters={({ filters, setFilter }) => {
        const items: React.ReactNode[] = [];

        if (showStatus) {
          items.push(
            <ExportFilterSelect
              key="status"
              label="Status"
              icon={CircleCheck}
              value={filters.status ?? "all"}
              onChange={(v) => setFilter("status", v)}
              options={BILL_STATUSES}
              optionLabels={BILL_STATUS_LABELS}
              allLabel="All statuses"
            />,
          );
        }

        if (showDirection) {
          items.push(
            <ExportFilterSelect
              key="direction"
              label="Direction"
              icon={ArrowLeftRight}
              value={filters.direction ?? "all"}
              onChange={(v) => setFilter("direction", v)}
              options={DIRECTION_OPTIONS}
              optionLabels={DIRECTION_LABELS}
              allLabel="All"
            />,
          );
        }

        if (!scopedToCustomer && customers) {
          const pickableCustomers = customers;
          items.push(
            <div key="customer" className="flex flex-col gap-1.5 sm:col-span-2">
              <Label className="text-xs">Customer</Label>
              <Select
                value={filters.customerId ?? "all"}
                onValueChange={(v) => setFilter("customerId", v ?? "all")}
              >
                <SelectTrigger className="w-full">
                  <FilterSelectValue
                    icon={User}
                    label="Customer"
                    render={(value) =>
                      value === "all"
                        ? "All"
                        : (pickableCustomers.find((c) => String(c.id) === value)
                            ?.name ?? value)
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {pickableCustomers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>,
          );
        }

        if (items.length === 0) return null;

        return (
          <div
            className={cn(
              "grid grid-cols-1 gap-3",
              items.length > 1 && "sm:grid-cols-2",
            )}
          >
            {items}
          </div>
        );
      }}
    />
  );
}

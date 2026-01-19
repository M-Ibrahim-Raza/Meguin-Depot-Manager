"use client";

import { CircleCheck, Wallet } from "lucide-react";
import * as React from "react";
import type { Button } from "@/components/ui/button";
import { ExportButton } from "@/features/export/components/export-button";
import { ExportFilterSelect } from "@/features/export/components/export-filter-select";
import {
  APPROVAL_STATUSES,
  APPROVAL_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/constants";
import type { ExportColumnMeta } from "@/server/export/types";

type Props = {
  columns: ExportColumnMeta[];
  customerId: number;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
};

/** Export trigger for a single customer's payments, with Approval/Method filters. */
export function PaymentsExportButton({
  columns,
  customerId,
  label = "Export",
  variant = "outline",
  size,
}: Props) {
  return (
    <ExportButton
      resource="payments"
      title="Payments"
      columns={columns}
      label={label}
      variant={variant}
      size={size}
      initialFilters={{ customerId: String(customerId) }}
      showDateRange
      renderFilters={({ filters, setFilter }) => (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ExportFilterSelect
            label="Approval"
            icon={CircleCheck}
            value={filters.approval ?? "all"}
            onChange={(v) => setFilter("approval", v)}
            options={APPROVAL_STATUSES}
            optionLabels={APPROVAL_STATUS_LABELS}
            allLabel="All statuses"
          />
          <ExportFilterSelect
            label="Method"
            icon={Wallet}
            value={filters.method ?? "all"}
            onChange={(v) => setFilter("method", v)}
            options={PAYMENT_METHODS}
            optionLabels={PAYMENT_METHOD_LABELS}
            allLabel="All methods"
          />
        </div>
      )}
    />
  );
}

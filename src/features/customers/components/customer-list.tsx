"use client";

import { MapPin, Plus, Search, Tag, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterSelectValue } from "@/components/ui/filter-select-value";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  type CustomerStatusKey,
} from "@/lib/constants";
import type { Customer } from "@/server/db/schema";
import type { ExportColumnMeta } from "@/server/export/types";
import { ExportButton } from "@/features/export/components/export-button";
import { filterCustomers } from "../lib";
import { CustomerFormDialog } from "./customer-form-dialog";
import { CustomerCard } from "./customer-card";

type Props = {
  customers: Customer[];
  canCreate?: boolean;
  isAdmin?: boolean;
  pendingByCustomer?: Map<number, number>;
  pendingPaymentsByCustomer?: Map<number, number>;
  pendingReturnByCustomer?: Map<number, number>;
  exportColumns?: ExportColumnMeta[];
};

type StatusFilter = "all" | CustomerStatusKey;

export function CustomerList({
  customers,
  canCreate = false,
  isAdmin = false,
  pendingByCustomer,
  pendingPaymentsByCustomer,
  pendingReturnByCustomer,
  exportColumns,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [addOpen, setAddOpen] = useState(false);

  const areas = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.area) set.add(c.area);
    });
    return ["all", ...Array.from(set).sort()];
  }, [customers]);

  const [areaFilter, setAreaFilter] = useState<string>("all");

  const visible = useMemo(
    () =>
      filterCustomers(customers, {
        search,
        status: statusFilter,
        area: areaFilter,
      }),
    [customers, search, statusFilter, areaFilter],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {canCreate ? (
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            className="sm:order-last"
          >
            <Plus className="size-4" />
            Add Customer
          </Button>
        ) : null}
        {isAdmin && exportColumns ? (
          <div className="sm:order-last">
            <ExportButton
              resource="customers"
              title="Customers"
              columns={exportColumns}
              showDateRange
              dateRangeLabel="Date added"
              initialFilters={{
                search,
                status: statusFilter,
                area: areaFilter,
              }}
            />
          </div>
        ) : null}
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or area…"
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter((v ?? "all") as StatusFilter)}
        >
          <SelectTrigger className="w-44">
            <FilterSelectValue
              icon={Tag}
              label="Status"
              render={(value) =>
                value === "all"
                  ? "All"
                  : (CUSTOMER_STATUS_LABELS[value as CustomerStatusKey] ??
                    value)
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CUSTOMER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {CUSTOMER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={areaFilter}
          onValueChange={(v) => setAreaFilter(v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <FilterSelectValue
              icon={MapPin}
              label="Area"
              render={(value) => (value === "all" ? "All" : value)}
            />
          </SelectTrigger>
          <SelectContent>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>
                {a === "all" ? "All Areas" : a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Users className="size-8" />
          <p className="text-sm">
            {customers.length === 0
              ? "No customers yet."
              : "No customers match these filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              pendingBillCount={pendingByCustomer?.get(c.id) ?? 0}
              pendingPaymentCount={pendingPaymentsByCustomer?.get(c.id) ?? 0}
              pendingReturnBillCount={pendingReturnByCustomer?.get(c.id) ?? 0}
            />
          ))}
        </div>
      )}

      {canCreate ? (
        <CustomerFormDialog open={addOpen} onOpenChange={setAddOpen} />
      ) : null}
    </div>
  );
}

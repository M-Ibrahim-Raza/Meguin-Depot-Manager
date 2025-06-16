"use client";

import { ArrowLeftRight, CircleCheck, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterSelectValue } from "@/components/ui/filter-select-value";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { BILL_STATUSES, BILL_STATUS_LABELS } from "@/lib/constants";
import type { Customer } from "@/server/db/schema";

const DIRECTION_OPTIONS = ["sale", "return"] as const;
const DIRECTION_LABELS: Record<(typeof DIRECTION_OPTIONS)[number], string> = {
  sale: "Sale",
  return: "Return",
};

type Props = {
  customers: Customer[];
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  customerId: string;
  setCustomerId: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  direction: string;
  setDirection: (value: string) => void;
  hasActiveFilter: boolean;
  clearFilters: () => void;
};

export function BillsFilters({
  customers,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  search,
  setSearch,
  customerId,
  setCustomerId,
  status,
  setStatus,
  direction,
  setDirection,
  hasActiveFilter,
  clearFilters,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
        />
        <div className="relative sm:col-span-2">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, bill no, note…"
            className="pl-8"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select
          value={customerId}
          onValueChange={(v) => setCustomerId(v ?? "all")}
        >
          <SelectTrigger className="w-52">
            <FilterSelectValue
              icon={User}
              label="Customer"
              render={(value) => {
                if (value === "all") return "All";
                const c = customers.find((x) => String(x.id) === value);
                return c?.name ?? value;
              }}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-44">
            <FilterSelectValue
              icon={CircleCheck}
              label="Status"
              render={(value) =>
                value === "all"
                  ? "All"
                  : (BILL_STATUS_LABELS[
                      value as (typeof BILL_STATUSES)[number]
                    ] ?? value)
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {BILL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {BILL_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={direction}
          onValueChange={(v) => setDirection(v ?? "all")}
        >
          <SelectTrigger className="w-40">
            <FilterSelectValue
              icon={ArrowLeftRight}
              label="Direction"
              render={(value) =>
                value === "all"
                  ? "All"
                  : (DIRECTION_LABELS[
                      value as (typeof DIRECTION_OPTIONS)[number]
                    ] ?? value)
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {DIRECTION_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {DIRECTION_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilter ? (
          <Button
            size="sm"
            variant="outline"
            onClick={clearFilters}
            className="ml-auto"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </>
  );
}

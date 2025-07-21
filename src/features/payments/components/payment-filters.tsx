"use client";

import { CircleCheck, CreditCard, Search, User } from "lucide-react";
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
  APPROVAL_STATUSES,
  APPROVAL_STATUS_LABELS,
  type ApprovalStatus,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/constants";
import type { Customer } from "@/server/db/schema";

type ApprovalFilter = "all" | (typeof APPROVAL_STATUSES)[number];
type MethodFilter = "all" | (typeof PAYMENT_METHODS)[number];

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
  approval: ApprovalFilter;
  setApproval: (value: ApprovalFilter) => void;
  method: MethodFilter;
  setMethod: (value: MethodFilter) => void;
  hasActiveFilter: boolean;
  clearFilters: () => void;
};

export function PaymentFilters({
  customers,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  search,
  setSearch,
  customerId,
  setCustomerId,
  approval,
  setApproval,
  method,
  setMethod,
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
            placeholder="Search customer, payment ID, note…"
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
        <Select
          value={approval}
          onValueChange={(v) => setApproval((v ?? "all") as ApprovalFilter)}
        >
          <SelectTrigger className="w-44">
            <FilterSelectValue
              icon={CircleCheck}
              label="Approval"
              render={(value) =>
                value === "all"
                  ? "All"
                  : (APPROVAL_STATUS_LABELS[value as ApprovalStatus] ?? value)
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {APPROVAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {APPROVAL_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={method}
          onValueChange={(v) => setMethod((v ?? "all") as MethodFilter)}
        >
          <SelectTrigger className="w-44">
            <FilterSelectValue
              icon={CreditCard}
              label="Method"
              render={(value) =>
                value === "all"
                  ? "All"
                  : (PAYMENT_METHOD_LABELS[value as PaymentMethod] ?? value)
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
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

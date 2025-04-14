"use client";

import {
  ArrowLeft,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  Undo2,
  UserPlus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CustomerActions } from "@/features/customers/components/customer-actions";
import type { getStatus } from "@/lib/format";
import type { Customer } from "@/server/db/schema";

type Props = {
  customer: Customer;
  status: ReturnType<typeof getStatus>;
  pendingBillsCount: number;
  pendingPaymentsCount: number;
  pendingReturnBillsCount: number;
  canEdit: boolean;
  onEdit: () => void;
};

export function CustomerDetailHeader({
  customer,
  status,
  pendingBillsCount,
  pendingPaymentsCount,
  pendingReturnBillsCount,
  canEdit,
  onEdit,
}: Props) {
  return (
    <div>
      <Link
        href="/customers"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "mb-2 -ml-2",
        })}
      >
        <ArrowLeft className="size-4" />
        Back to customers
      </Link>

      {pendingBillsCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Receipt className="size-4 shrink-0" />
          <span>
            <strong>{pendingBillsCount}</strong> bill
            {pendingBillsCount > 1 ? "s" : ""} pending approval — awaiting admin
            review
          </span>
        </div>
      )}
      {pendingPaymentsCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Wallet className="size-4 shrink-0" />
          <span>
            <strong>{pendingPaymentsCount}</strong> payment
            {pendingPaymentsCount > 1 ? "s" : ""} pending approval — awaiting
            admin review
          </span>
        </div>
      )}
      {pendingReturnBillsCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Undo2 className="size-4 shrink-0" />
          <span>
            <strong>{pendingReturnBillsCount}</strong> return bill
            {pendingReturnBillsCount > 1 ? "s" : ""} pending approval — awaiting
            admin review
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {customer.area ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {customer.area}
              </span>
            ) : null}
            {customer.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" />
                {customer.phone}
              </span>
            ) : null}
            {customer.referral ? (
              <span className="inline-flex items-center gap-1">
                <UserPlus className="size-3.5" />
                {customer.referral}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
          <CustomerActions customer={customer} />
        </div>
      </div>
    </div>
  );
}

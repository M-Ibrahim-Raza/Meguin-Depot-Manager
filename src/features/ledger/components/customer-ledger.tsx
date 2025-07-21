"use client";

import { useMemo, useState } from "react";
import { ExportButton } from "@/features/export/components/export-button";
import { fmtDate } from "@/lib/format";
import type { Bill, Payment, PaymentReversal } from "@/server/db/schema";
import type { ExportColumnMeta } from "@/server/export/types";
import {
  buildLedger,
  filterLedger,
  LEDGER_KIND_ORDER,
  type LedgerEntry,
  type LedgerKind,
} from "../ledger";
import { LedgerFilters } from "./ledger-filters";
import { LedgerRow } from "./ledger-row";

type Props = {
  bills: Bill[];
  returnBills: Bill[];
  payments: Payment[];
  reversals: PaymentReversal[];
  customerId: number;
  /** Export columns (admin only); enables the per-customer ledger export. */
  ledgerExportColumns?: ExportColumnMeta[];
};

/**
 * Combined ledger tab: a date-sorted timeline of sale bills, return bills,
 * approved payments, and approved reversals with a running balance, plus a
 * left filtration panel.
 */
export function CustomerLedger({
  bills,
  returnBills,
  payments,
  reversals,
  customerId,
  ledgerExportColumns,
}: Props) {
  // Built over the full history so running balances are always correct;
  // display-time filtering never touches the balance math.
  const ledger = useMemo(
    () => buildLedger({ bills, returnBills, payments, reversals }),
    [bills, returnBills, payments, reversals],
  );

  const [kinds, setKinds] = useState<Set<LedgerKind>>(
    () => new Set(LEDGER_KIND_ORDER),
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);

  const hasActiveFilter =
    kinds.size !== LEDGER_KIND_ORDER.length || dateFrom !== "" || dateTo !== "";

  // Single source of truth for the kinds filter, shared by the on-screen list
  // and the export dialog's initialFilters so the two can never drift. "none"
  // (not an empty string) survives the export dialog's query-string
  // serialization, which drops any filter value that's falsy or "all".
  const kindsParam = useMemo(() => {
    if (kinds.size === LEDGER_KIND_ORDER.length) return "all";
    if (kinds.size === 0) return "none";
    return Array.from(kinds).join(",");
  }, [kinds]);

  const visible = useMemo(
    () => filterLedger(ledger, { kinds: kindsParam, dateFrom, dateTo }),
    [ledger, kindsParam, dateFrom, dateTo],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, LedgerEntry[]>();
    for (const e of visible) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [visible]);

  function toggleKind(kind: LedgerKind) {
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function clearFilters() {
    setKinds(new Set(LEDGER_KIND_ORDER));
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <aside className="md:w-60 md:shrink-0 lg:w-64">
        <LedgerFilters
          kinds={kinds}
          onToggleKind={toggleKind}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          hasActiveFilter={hasActiveFilter}
          onClear={clearFilters}
        />
      </aside>

      <div className="min-w-0 flex-1">
        {ledgerExportColumns ? (
          <div className="mb-4 flex justify-end">
            <ExportButton
              resource="ledger"
              title="Ledger"
              columns={ledgerExportColumns}
              size="sm"
              showDateRange
              initialFilters={{
                customerId: String(customerId),
                kinds: kindsParam,
                dateFrom,
                dateTo,
              }}
            />
          </div>
        ) : null}

        {grouped.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
            {ledger.length === 0
              ? "No ledger activity yet."
              : "No entries match these filters."}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(([date, rows]) => (
              <section key={date} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs font-semibold">
                    {fmtDate(date)}
                  </div>
                  <div className="bg-border h-px flex-1" />
                </div>
                <div className="flex flex-col gap-2">
                  {rows.map((e) => (
                    <LedgerRow key={e.key} entry={e} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

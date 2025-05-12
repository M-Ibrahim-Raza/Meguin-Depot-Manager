"use client";

import { CalendarDays } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DATE_RANGE_PRESET_LABELS,
  type DateRangePreset,
} from "@/lib/date-range";
import { fmtDate } from "@/lib/format";

/** The selected range: a preset, plus `from`/`to` (`YYYY-MM-DD`) when custom. */
export type DateRangeValue = {
  range: DateRangePreset;
  from?: string;
  to?: string;
};

/** Quick presets rendered as chips; `custom` is the calendar popover. */
const QUICK_PRESETS: DateRangePreset[] = [
  "today",
  "last7",
  "last30",
  "thisMonth",
];

type Props = {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
};

/** Local calendar day (the day the user clicked) → `YYYY-MM-DD`. */
function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** `YYYY-MM-DD` → a local-midnight Date the calendar can render. */
function fromYmd(s?: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function customLabel(from?: string, to?: string): string {
  const f = fromYmd(from);
  const t = fromYmd(to);
  if (f && t) return `${fmtDate(f)} – ${fmtDate(t)}`;
  if (f) return `From ${fmtDate(f)}`;
  if (t) return `Until ${fmtDate(t)}`;
  return DATE_RANGE_PRESET_LABELS.custom;
}

/**
 * Preset chips + a custom calendar range, in a single control. Stateless: the
 * caller owns `value` (typically URL-backed) and applies `onChange`. Shared so
 * other list pages can adopt the same date filter.
 */
export function DateRangePicker({ value, onChange }: Props) {
  const isCustom = value.range === "custom";
  const selected: DateRange | undefined = fromYmd(value.from)
    ? { from: fromYmd(value.from), to: fromYmd(value.to) }
    : undefined;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {QUICK_PRESETS.map((preset) => (
        <Button
          key={preset}
          type="button"
          size="sm"
          variant={value.range === preset ? "default" : "outline"}
          onClick={() => onChange({ range: preset })}
        >
          {DATE_RANGE_PRESET_LABELS[preset]}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant={isCustom ? "default" : "outline"}
              aria-label="Custom date range"
            />
          }
        >
          <CalendarDays className="size-4" />
          {isCustom ? customLabel(value.from, value.to) : "Custom"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            autoFocus
            defaultMonth={selected?.from}
            selected={selected}
            onSelect={(range) =>
              onChange({
                range: "custom",
                from: range?.from ? toYmd(range.from) : undefined,
                to: range?.to ? toYmd(range.to) : undefined,
              })
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

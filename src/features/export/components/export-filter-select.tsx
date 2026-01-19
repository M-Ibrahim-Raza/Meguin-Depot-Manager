"use client";

import type { LucideIcon } from "lucide-react";
import { FilterSelectValue } from "@/components/ui/filter-select-value";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

type Props<T extends string> = {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  options: readonly T[];
  optionLabels: Record<T, string>;
  allLabel?: string;
};

export function ExportFilterSelect<T extends string>({
  label,
  icon,
  value,
  onChange,
  options,
  optionLabels,
  allLabel = "All",
}: Props<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? "all")}>
        <SelectTrigger className="w-full">
          <FilterSelectValue
            icon={icon}
            label={label}
            render={(v) => (v === "all" ? "All" : (optionLabels[v as T] ?? v))}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {optionLabels[o]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

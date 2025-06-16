"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { BillCopyTitle } from "../lib";

type Props = {
  titles: readonly BillCopyTitle[];
  selected: ReadonlySet<BillCopyTitle>;
  onToggle: (title: BillCopyTitle) => void;
};

/** Lets the user pick which of a bill's print copies to include, print:hidden. */
export function PrintCopySelector({ titles, selected, onToggle }: Props) {
  return (
    <div className="mx-auto flex max-w-198.5 flex-wrap items-center gap-4 px-4 pb-3 print:hidden">
      {titles.map((title) => {
        const id = `print-copy-${title.toLowerCase().replace(/\s+/g, "-")}`;
        return (
          <div key={title} className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={selected.has(title)}
              onCheckedChange={() => onToggle(title)}
            />
            <Label htmlFor={id} className="text-sm font-normal">
              {title}
            </Label>
          </div>
        );
      })}
      {selected.size === 0 ? (
        <p className="text-muted-foreground text-xs">
          Select at least one copy to print.
        </p>
      ) : null}
    </div>
  );
}

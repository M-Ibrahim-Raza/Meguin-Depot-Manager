import { type LucideIcon } from "lucide-react";
import { SelectValue } from "@/components/ui/select";

type Props = {
  icon: LucideIcon;
  label: string;
  render: (value: string) => string;
};

export function FilterSelectValue({ icon: Icon, label, render }: Props) {
  return (
    <SelectValue>
      {(value: string) => (
        <span className="flex items-center gap-1.5 truncate">
          <Icon className="text-muted-foreground size-3.5 shrink-0" />
          <span className="text-muted-foreground">{label}:</span>
          <span className="truncate">{render(value)}</span>
        </span>
      )}
    </SelectValue>
  );
}

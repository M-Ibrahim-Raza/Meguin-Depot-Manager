import { CircleAlert, CircleCheck, CircleDot, CircleSlash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CUSTOMER_STATUS_LABELS,
  type CustomerStatusKey,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  status: CustomerStatusKey;
  className?: string;
};

const TONE: Record<
  CustomerStatusKey,
  { className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  clear: {
    className: "bg-emerald-100 text-emerald-900 border-emerald-200",
    Icon: CircleCheck,
  },
  active: {
    className: "bg-blue-100 text-blue-900 border-blue-200",
    Icon: CircleDot,
  },
  warning: {
    className: "bg-amber-100 text-amber-900 border-amber-200",
    Icon: CircleAlert,
  },
  overlimit: {
    className: "bg-red-100 text-red-900 border-red-200",
    Icon: CircleSlash,
  },
};

export function StatusBadge({ status, className }: Props) {
  const { className: tone, Icon } = TONE[status];
  return (
    <Badge variant="outline" className={cn(tone, "gap-1", className)}>
      <Icon className="size-3" />
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  );
}

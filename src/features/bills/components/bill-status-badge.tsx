import { CircleCheck, CircleX, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BillStatus = "pending_approval" | "rejected" | "unpaid" | "paid";

type Props = {
  status: BillStatus;
  className?: string;
};

const TONE: Record<
  BillStatus,
  { className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending_approval: {
    className: "bg-amber-100 text-amber-900 border-amber-200",
    Icon: Clock,
  },
  unpaid: {
    className: "bg-amber-100 text-amber-900 border-amber-200",
    Icon: AlertCircle,
  },
  paid: {
    className: "bg-emerald-100 text-emerald-900 border-emerald-200",
    Icon: CircleCheck,
  },
  rejected: {
    className: "bg-red-100 text-red-900 border-red-200",
    Icon: CircleX,
  },
};

const LABELS: Record<BillStatus, string> = {
  pending_approval: "Pending Approval",
  unpaid: "Unpaid",
  paid: "Paid",
  rejected: "Rejected",
};

export function BillStatusBadge({ status, className }: Props) {
  const { className: tone, Icon } = TONE[status];
  return (
    <Badge variant="outline" className={cn(tone, "gap-1", className)}>
      <Icon className="size-3" />
      {LABELS[status]}
    </Badge>
  );
}

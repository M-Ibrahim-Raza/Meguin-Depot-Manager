import { CircleCheck, CircleX, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { APPROVAL_STATUS_LABELS, type ApprovalStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  approval: ApprovalStatus;
  className?: string;
};

const TONE: Record<
  ApprovalStatus,
  { className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    className: "bg-amber-100 text-amber-900 border-amber-200",
    Icon: Clock,
  },
  approved: {
    className: "bg-emerald-100 text-emerald-900 border-emerald-200",
    Icon: CircleCheck,
  },
  rejected: {
    className: "bg-red-100 text-red-900 border-red-200",
    Icon: CircleX,
  },
};

export function ApprovalBadge({ approval, className }: Props) {
  const { className: tone, Icon } = TONE[approval];
  return (
    <Badge variant="outline" className={cn(tone, "gap-1", className)}>
      <Icon className="size-3" />
      {APPROVAL_STATUS_LABELS[approval]}
    </Badge>
  );
}

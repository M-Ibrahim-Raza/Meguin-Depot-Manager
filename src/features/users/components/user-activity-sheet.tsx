"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { trpc } from "@/trpc/react";

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deactivated: "Deactivated",
  reactivated: "Reactivated",
  password_reset: "Password reset",
};

function formatWhen(d: Date | string) {
  return new Date(d).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type Props = {
  userId?: string;
  userName?: string;
  onOpenChange: (open: boolean) => void;
};

export function UserActivitySheet({ userId, userName, onOpenChange }: Props) {
  const { data, isLoading } = trpc.users.auditLog.useQuery(
    { userId: userId ?? "" },
    { enabled: !!userId },
  );

  return (
    <Sheet open={!!userId} onOpenChange={(o) => !o && onOpenChange(false)}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Activity — {userName}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 overflow-y-auto">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No activity recorded yet.
            </p>
          ) : (
            data.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-0.5 border-b pb-3 text-sm last:border-0"
              >
                <span className="font-medium">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatWhen(entry.createdAt)} · by{" "}
                  {entry.actorName ?? "Unknown"}
                </span>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import {
  Activity,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Tag,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterSelectValue } from "@/components/ui/filter-select-value";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  USER_STATUSES,
  USER_STATUS_LABELS,
  type UserRole,
  type UserStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { User } from "@/server/db/schema";
import { filterUsers } from "../lib";
import { DeactivateAlertDialog } from "./deactivate-alert-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserActivitySheet } from "./user-activity-sheet";
import { UserFormDialog } from "./user-form-dialog";

type Props = {
  users: User[];
  currentUserId: string;
};

type RoleFilter = "all" | UserRole;
type StatusFilter = "all" | UserStatus;

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-PK", { dateStyle: "medium" });
}

export function UserList({ users, currentUserId }: Props) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<User | undefined>(undefined);
  const [resetting, setResetting] = useState<User | undefined>(undefined);
  const [deactivating, setDeactivating] = useState<User | undefined>(undefined);
  const [viewingActivity, setViewingActivity] = useState<User | undefined>(
    undefined,
  );

  const visible = useMemo(
    () =>
      filterUsers(users, {
        search,
        role: roleFilter,
        status: statusFilter,
      }),
    [users, search, roleFilter, statusFilter],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          onClick={() => setAddOpen(true)}
          className="sm:order-last"
        >
          <Plus className="size-4" />
          Add User
        </Button>
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-8"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter((v ?? "all") as RoleFilter)}
        >
          <SelectTrigger className="w-40">
            <FilterSelectValue
              icon={Tag}
              label="Role"
              render={(value) =>
                value === "all"
                  ? "All"
                  : (USER_ROLE_LABELS[value as keyof typeof USER_ROLE_LABELS] ??
                    value)
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {USER_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {USER_ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter((v ?? "all") as StatusFilter)}
        >
          <SelectTrigger className="w-40">
            <FilterSelectValue
              icon={Tag}
              label="Status"
              render={(value) =>
                value === "all"
                  ? "All"
                  : (USER_STATUS_LABELS[value as UserStatus] ?? value)
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {USER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {USER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Users className="size-8" />
          <p className="text-sm">
            {users.length === 0
              ? "No users yet."
              : "No users match these filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name ?? "—"}
                    {u.id === currentUserId ? (
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        (you)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.role === "admin" ? "default" : "secondary"}
                    >
                      {USER_ROLE_LABELS[
                        u.role as keyof typeof USER_ROLE_LABELS
                      ] ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        u.isActive
                          ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                          : "border-red-200 bg-red-100 text-red-900",
                      )}
                    >
                      {u.isActive
                        ? USER_STATUS_LABELS.active
                        : USER_STATUS_LABELS.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground size-7"
                            aria-label="User actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(u)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetting(u)}>
                          <KeyRound className="size-4" />
                          Reset password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setViewingActivity(u)}>
                          <Activity className="size-4" />
                          View activity
                        </DropdownMenuItem>
                        {u.id !== currentUserId ? (
                          <DropdownMenuItem
                            onClick={() => setDeactivating(u)}
                            variant={u.isActive ? "destructive" : "default"}
                          >
                            {u.isActive ? (
                              <PowerOff className="size-4" />
                            ) : (
                              <Power className="size-4" />
                            )}
                            {u.isActive ? "Deactivate" : "Reactivate"}
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <UserFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        currentUserId={currentUserId}
      />
      <UserFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(undefined)}
        user={editing}
        currentUserId={currentUserId}
      />
      <ResetPasswordDialog
        open={!!resetting}
        onOpenChange={(o) => !o && setResetting(undefined)}
        user={resetting}
      />
      <DeactivateAlertDialog
        user={deactivating}
        onOpenChange={(o) => !o && setDeactivating(undefined)}
      />
      <UserActivitySheet
        userId={viewingActivity?.id}
        userName={viewingActivity?.name ?? viewingActivity?.email}
        onOpenChange={(o) => !o && setViewingActivity(undefined)}
      />
    </div>
  );
}

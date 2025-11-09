"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_ROLES, USER_ROLE_LABELS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/trpc-error";
import type { User } from "@/server/db/schema";
import { trpc } from "@/trpc/react";
import {
  createUserSchema,
  updateUserSchema,
  type UserRoleInput,
} from "../schemas";

type FormValues = {
  name: string;
  email: string;
  role: UserRoleInput;
  password: string;
};

const CREATE_DEFAULTS: FormValues = {
  name: "",
  email: "",
  role: "user",
  password: "",
};

function userToDefaults(u: User): FormValues {
  return {
    name: u.name ?? "",
    email: u.email,
    role: u.role as UserRoleInput,
    password: "",
  };
}

const updateFormSchema = updateUserSchema.omit({ id: true });

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
  currentUserId: string;
};

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
}: Props) {
  const editing = !!user;
  const isSelf = user?.id === currentUserId;
  const router = useRouter();

  const onSuccess = () => {
    toast.success(editing ? "User updated" : "User created");
    onOpenChange(false);
    router.refresh();
  };
  const onError = (error: Parameters<typeof getErrorMessage>[0]) =>
    toast.error(getErrorMessage(error));

  const createMutation = trpc.users.create.useMutation({ onSuccess, onError });
  const updateMutation = trpc.users.update.useMutation({ onSuccess, onError });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(
      (editing ? updateFormSchema : createUserSchema) as never,
    ),
    defaultValues: user ? userToDefaults(user) : CREATE_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(user ? userToDefaults(user) : CREATE_DEFAULTS);
    }
  }, [open, user, form]);

  function onSubmit(values: FormValues) {
    if (user) {
      updateMutation.mutate({
        id: user.id,
        name: values.name,
        email: values.email,
        role: values.role,
      });
    } else {
      createMutation.mutate({
        name: values.name,
        email: values.email,
        role: values.role,
        password: values.password,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update this user's details and role."
              : "Create a user or admin account. Share the password with the user directly."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ahmed Khan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@meguin.test"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) =>
                      field.onChange((v ?? "user") as UserRoleInput)
                    }
                    disabled={isSelf}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {USER_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {USER_ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isSelf ? (
                    <p className="text-muted-foreground text-sm">
                      You cannot change your own role.
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            {!editing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-muted-foreground text-sm">
                      Share this password with the user directly — there is no
                      email invite flow.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? editing
                    ? "Saving…"
                    : "Creating…"
                  : editing
                    ? "Save Changes"
                    : "Add User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

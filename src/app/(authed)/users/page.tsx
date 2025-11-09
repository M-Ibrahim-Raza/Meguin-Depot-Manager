import { notFound } from "next/navigation";
import { UserList } from "@/features/users/components/user-list";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";

export default async function UsersPage() {
  // Manage Users is admin-only — non-admins (and anonymous requests) get a 404.
  const session = await auth();
  if (session?.user?.role !== "admin") {
    notFound();
  }

  const users = await api.users.list();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Manage Users</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {users.length} user{users.length === 1 ? "" : "s"}
        </p>
      </div>
      <UserList users={users} currentUserId={session.user.id} />
    </div>
  );
}

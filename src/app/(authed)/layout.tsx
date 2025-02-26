import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLinks } from "@/components/nav-links";
import { logoutAction } from "@/features/auth/actions";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  const isAdmin = user?.role === "admin";
  let pendingBillCount = 0;
  let pendingPaymentCount = 0;
  if (isAdmin) {
    const [bills, payments, returnBills, reversals] = await Promise.all([
      api.bills.pendingCount(),
      api.payments.pendingCount(),
      api.returns.pendingCount(),
      api.paymentReversals.pendingCount(),
    ]);
    // The "Customers" nav badge aggregates everything awaiting review on a
    // customer page — pending sale bills and pending return bills alike.
    pendingBillCount = bills.count + returnBills.count;
    // The "Payments" nav badge likewise aggregates pending payments and
    // pending reversal requests — both await the same admin review.
    pendingPaymentCount = payments + reversals;
  }

  return (
    <div className="bg-muted/30 flex min-h-screen flex-col print:bg-white">
      <header className="bg-background flex items-center justify-between border-b px-6 py-3 print:hidden">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold">MMS</span>
          <NavLinks
            pendingBillCount={pendingBillCount}
            pendingPaymentCount={pendingPaymentCount}
            isAdmin={isAdmin}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">
            {user?.email} · <span className="font-medium">{user?.role}</span>
          </span>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

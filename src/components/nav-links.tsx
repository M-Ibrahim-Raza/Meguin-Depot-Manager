"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type NavItem = { href: string; label: string; adminOnly?: boolean };

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/bills", label: "Bills" },
  { href: "/payments", label: "Payments" },
  { href: "/products", label: "Products" },
  { href: "/stock", label: "Stock" },
  { href: "/stock/transfers", label: "Transfers" },
  { href: "/users", label: "Manage Users", adminOnly: true },
];

type Props = {
  pendingBillCount?: number;
  pendingPaymentCount?: number;
  isAdmin?: boolean;
};

export function NavLinks({
  pendingBillCount = 0,
  pendingPaymentCount = 0,
  isAdmin = false,
}: Props) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.adminOnly || isAdmin);
  const countByHref: Record<string, number> = {
    "/customers": pendingBillCount,
    "/bills": pendingBillCount,
    "/payments": pendingPaymentCount,
  };
  // The most-specific matching item wins, so /stock/transfers highlights
  // "Transfers" alone rather than also lighting up "Stock".
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .reduce<
      string | null
    >((best, i) => (best && best.length >= i.href.length ? best : i.href), null);
  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
        const active = activeHref === item.href;
        const badgeCount = countByHref[item.href] ?? 0;
        const showBadge = badgeCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {item.label}
            {showBadge ? (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full p-0 text-xs font-bold"
              >
                {badgeCount}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

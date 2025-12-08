import { notFound } from "next/navigation";
import { ReversalsQueue } from "@/features/payment-reversals/components/reversals-queue";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";

export default async function PaymentReversalsPage() {
  // Reversal review is admin-only — non-admins (and anonymous requests) get a 404.
  const session = await auth();
  if (session?.user?.role !== "admin") {
    notFound();
  }

  const reversals = await api.paymentReversals.listPending();

  return <ReversalsQueue reversals={reversals} />;
}

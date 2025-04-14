import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  bills,
  customers,
  payments,
  users,
  type Bill,
  type Customer,
  type NewCustomer,
  type Payment,
} from "@/server/db/schema";

export type CustomerStats = {
  totalCount: number;
  activeCount: number;
  overlimitCount: number;
  totalOutstandingPaisas: bigint;
};

export async function listCustomers(): Promise<Customer[]> {
  return db.select().from(customers).orderBy(asc(customers.name));
}

export async function createCustomer(input: NewCustomer): Promise<Customer> {
  const [row] = await db.insert(customers).values(input).returning();
  return row;
}

export type UpdateCustomerFields = Pick<
  NewCustomer,
  "name" | "area" | "phone" | "referral" | "creditLimitPaisas" | "paymentType"
>;

export async function updateCustomer(
  id: number,
  input: UpdateCustomerFields,
): Promise<Customer | undefined> {
  const [row] = await db
    .update(customers)
    .set(input)
    .where(eq(customers.id, id))
    .returning();
  return row;
}

export async function getCustomer(id: number): Promise<Customer | undefined> {
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return row;
}

export async function getCustomerBills(customerId: number): Promise<Bill[]> {
  return db
    .select()
    .from(bills)
    .where(and(eq(bills.customerId, customerId), eq(bills.direction, "sale")))
    .orderBy(desc(bills.date));
}

export type ReturnBillWithCreator = Bill & { createdByName: string | null };

/** A customer's return bills, newest first, with the creator's name resolved
 * (return bills can now be created by any user, not just admins). */
export async function getCustomerReturnBills(
  customerId: number,
): Promise<ReturnBillWithCreator[]> {
  const rows = await db
    .select({ bill: bills, createdByName: users.name })
    .from(bills)
    .leftJoin(users, eq(users.id, bills.createdBy))
    .where(and(eq(bills.customerId, customerId), eq(bills.direction, "return")))
    .orderBy(desc(bills.date));
  return rows.map((r) => ({ ...r.bill, createdByName: r.createdByName }));
}

export async function getCustomerPayments(
  customerId: number,
): Promise<Payment[]> {
  return db
    .select()
    .from(payments)
    .where(eq(payments.customerId, customerId))
    .orderBy(desc(payments.date));
}

export async function getCustomerStats(): Promise<CustomerStats> {
  const [row] = await db
    .select({
      totalCount: sql<number>`count(*)::int`,
      activeCount: sql<number>`count(*) filter (where ${customers.outstandingPaisas} > 0)::int`,
      overlimitCount: sql<number>`count(*) filter (where ${customers.outstandingPaisas} > 0 and ${customers.outstandingPaisas} >= ${customers.creditLimitPaisas})::int`,
      totalOutstandingPaisas: sql<bigint>`coalesce(sum(${customers.outstandingPaisas}), 0)::bigint`,
    })
    .from(customers);

  return {
    totalCount: Number(row?.totalCount ?? 0),
    activeCount: Number(row?.activeCount ?? 0),
    overlimitCount: Number(row?.overlimitCount ?? 0),
    totalOutstandingPaisas: BigInt(row?.totalOutstandingPaisas ?? 0),
  };
}

/** Customers with positive outstanding, ordered by outstanding desc. */
export async function getTopOutstandingCustomers(limit = 5) {
  return db
    .select()
    .from(customers)
    .where(gt(customers.outstandingPaisas, 0n))
    .orderBy(desc(customers.outstandingPaisas))
    .limit(limit);
}

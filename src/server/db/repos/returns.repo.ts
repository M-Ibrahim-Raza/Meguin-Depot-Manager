import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { addQty, toQty } from "@/features/stock/lib";
import { db } from "@/server/db/client";
import { billItems, bills, products } from "@/server/db/schema";

export type ReturnableProduct = {
  articleNumber: string;
  name: string;
  unit: string;
  category: string;
  /** Quantity still in the customer's hands (sold − already returned). */
  returnableQty: number;
  /** Most recent unit price the customer actually paid for this product. */
  latestUnitPricePaisas: bigint;
};

/**
 * Products this customer can still return: everything they were sold (cash or
 * deferred) minus what they've already returned, where the remainder is
 * positive. Each is priced at the latest unit price the customer actually paid,
 * so a return reverses outstanding by what was charged. Used by both the return
 * form (to populate the picker) and the create mutation (to cap and price lines).
 */
export async function getReturnableProducts(
  customerId: number,
): Promise<ReturnableProduct[]> {
  // Net quantity still held by the customer, per product (sold − returned).
  const netRows = await db
    .select({
      articleNumber: billItems.articleNumber,
      sold: sql<string>`coalesce(sum(${billItems.qty}) filter (where ${bills.direction} = 'sale'), 0)`,
      returned: sql<string>`coalesce(sum(${billItems.qty}) filter (where ${bills.direction} = 'return'), 0)`,
    })
    .from(billItems)
    .innerJoin(bills, eq(bills.id, billItems.billId))
    .where(and(eq(bills.customerId, customerId), ne(bills.status, "rejected")))
    .groupBy(billItems.articleNumber);

  // Latest sale price + current product info, one row per product.
  const latest = await db
    .selectDistinctOn([billItems.articleNumber], {
      articleNumber: billItems.articleNumber,
      unitPricePaisas: billItems.unitPricePaisas,
      name: products.name,
      unit: products.unit,
      category: products.category,
    })
    .from(billItems)
    .innerJoin(bills, eq(bills.id, billItems.billId))
    .innerJoin(products, eq(products.articleNumber, billItems.articleNumber))
    .where(
      and(
        eq(bills.customerId, customerId),
        eq(bills.direction, "sale"),
        ne(bills.status, "rejected"),
      ),
    )
    .orderBy(asc(billItems.articleNumber), desc(bills.date), desc(bills.id));

  const latestByArticle = new Map(latest.map((r) => [r.articleNumber, r]));

  const result: ReturnableProduct[] = [];
  for (const row of netRows) {
    const net = addQty(toQty(row.sold), -toQty(row.returned));
    if (net <= 0) continue;
    const info = latestByArticle.get(row.articleNumber);
    if (!info) continue; // never sold → nothing to return
    result.push({
      articleNumber: row.articleNumber,
      name: info.name,
      unit: info.unit,
      category: info.category,
      returnableQty: net,
      latestUnitPricePaisas: info.unitPricePaisas,
    });
  }
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

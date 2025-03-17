import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  products,
  stock,
  type NewProduct,
  type Product,
} from "@/server/db/schema";

export type ProductInput = {
  articleNumber: string;
  name: string;
  unit: string;
  category: string;
  pricePaisas: bigint;
};

/** Mutable product fields (everything except the immutable article number key). */
export type ProductFields = Omit<ProductInput, "articleNumber">;

export async function listProducts(): Promise<Product[]> {
  return db.select().from(products).orderBy(asc(products.name));
}

export async function getProduct(
  articleNumber: string,
): Promise<Product | undefined> {
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.articleNumber, articleNumber))
    .limit(1);
  return row;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(products)
      .values(input satisfies NewProduct)
      .returning();
    // Every product is stock-tracked: create its stock row at 0 in the same
    // transaction so the inventory is always complete.
    await tx.insert(stock).values({ articleNumber: row.articleNumber });
    return row;
  });
}

export async function updateProduct(
  articleNumber: string,
  fields: ProductFields,
): Promise<Product | undefined> {
  const [row] = await db
    .update(products)
    .set(fields)
    .where(eq(products.articleNumber, articleNumber))
    .returning();
  return row;
}

export async function deleteProduct(articleNumber: string): Promise<void> {
  await db.delete(products).where(eq(products.articleNumber, articleNumber));
}

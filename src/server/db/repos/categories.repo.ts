import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  categories,
  products,
  type Category,
  type NewCategory,
} from "@/server/db/schema";

export async function listCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function getCategory(id: number): Promise<Category | undefined> {
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return row;
}

export async function createCategory(name: string): Promise<Category> {
  const [row] = await db
    .insert(categories)
    .values({ name } satisfies NewCategory)
    .returning();
  return row;
}

export async function deleteCategory(id: number): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

/** Number of products currently filed under this category name. */
export async function countProductsInCategory(name: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.category, name));
  return Number(row?.count ?? 0);
}

export async function categoryExists(name: string): Promise<boolean> {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.name, name))
    .limit(1);
  return !!row;
}

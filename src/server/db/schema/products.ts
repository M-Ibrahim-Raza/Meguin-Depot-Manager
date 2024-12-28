import { bigint, boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const products = pgTable("product", {
  articleNumber: text("article_number").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  category: text("category").notNull(),
  pricePaisas: bigint("price_paisas", { mode: "bigint" }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

CREATE TABLE "category" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
-- Backfill: existing products' categories become managed categories so the
-- dropdown is never empty after upgrading an existing database.
INSERT INTO "category" ("name")
SELECT DISTINCT "category" FROM "product"
ON CONFLICT ("name") DO NOTHING;

CREATE TABLE "stock" (
	"article_number" text PRIMARY KEY NOT NULL,
	"quantity_on_hand" numeric(12, 3) DEFAULT '0' NOT NULL,
	"reorder_level" numeric(12, 3),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movement" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_number" text NOT NULL,
	"kind" text NOT NULL,
	"qty_delta" numeric(12, 3) NOT NULL,
	"balance_after" numeric(12, 3) NOT NULL,
	"bill_id" integer,
	"note" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_article_number_product_article_number_fk" FOREIGN KEY ("article_number") REFERENCES "public"."product"("article_number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_article_number_product_article_number_fk" FOREIGN KEY ("article_number") REFERENCES "public"."product"("article_number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_bill_id_bill_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bill"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_movement_article_idx" ON "stock_movement" USING btree ("article_number","created_at");--> statement-breakpoint
CREATE INDEX "stock_movement_bill_idx" ON "stock_movement" USING btree ("bill_id");--> statement-breakpoint
-- Backfill: every existing product gets a stock row at 0 so the inventory is
-- complete after upgrading. Opening quantities are then set from the Stock page.
INSERT INTO "stock" ("article_number", "quantity_on_hand")
SELECT "article_number", 0 FROM "product"
ON CONFLICT ("article_number") DO NOTHING;
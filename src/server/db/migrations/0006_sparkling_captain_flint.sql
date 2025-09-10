CREATE TABLE "stock_transfer" (
	"id" serial PRIMARY KEY NOT NULL,
	"slip_no" text NOT NULL,
	"from_location" text NOT NULL,
	"to_location" text NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_transfer_slip_no_unique" UNIQUE("slip_no")
);
--> statement-breakpoint
CREATE TABLE "stock_transfer_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"transfer_id" integer NOT NULL,
	"article_number" text NOT NULL,
	"name_snapshot" text NOT NULL,
	"unit_snapshot" text NOT NULL,
	"qty" numeric(12, 3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bill_item" ADD COLUMN "source_location" text DEFAULT 'warehouse' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock" ADD COLUMN "warehouse_qty" numeric(12, 3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock" ADD COLUMN "office_qty" numeric(12, 3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD COLUMN "location" text DEFAULT 'warehouse' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD COLUMN "transfer_id" integer;--> statement-breakpoint
ALTER TABLE "stock_transfer" ADD CONSTRAINT "stock_transfer_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_item" ADD CONSTRAINT "stock_transfer_item_transfer_id_stock_transfer_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_item" ADD CONSTRAINT "stock_transfer_item_article_number_product_article_number_fk" FOREIGN KEY ("article_number") REFERENCES "public"."product"("article_number") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_transfer_id_stock_transfer_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_movement_transfer_idx" ON "stock_movement" USING btree ("transfer_id");--> statement-breakpoint
-- Preserve on-hand: existing global stock lives entirely in the warehouse.
UPDATE "stock" SET "warehouse_qty" = "quantity_on_hand";--> statement-breakpoint
ALTER TABLE "stock" DROP COLUMN "quantity_on_hand";
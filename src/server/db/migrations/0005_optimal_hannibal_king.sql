ALTER TABLE "bill" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "bill" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "bill" ADD COLUMN "reject_reason" text;--> statement-breakpoint
ALTER TABLE "bill" ADD CONSTRAINT "bill_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
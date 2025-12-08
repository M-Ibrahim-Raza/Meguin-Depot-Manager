CREATE TABLE "payment_reversal" (
	"id" serial PRIMARY KEY NOT NULL,
	"reversal_no" text NOT NULL,
	"payment_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"amount_paisas" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"requested_by" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"reject_reason" text,
	CONSTRAINT "payment_reversal_reversal_no_unique" UNIQUE("reversal_no")
);
--> statement-breakpoint
ALTER TABLE "payment_reversal" ADD CONSTRAINT "payment_reversal_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reversal" ADD CONSTRAINT "payment_reversal_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reversal" ADD CONSTRAINT "payment_reversal_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_reversal_payment_idx" ON "payment_reversal" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_reversal_status_idx" ON "payment_reversal" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_reversal_customer_idx" ON "payment_reversal" USING btree ("customer_id");
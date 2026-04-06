CREATE INDEX "bill_item_bill_idx" ON "bill_item" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "bill_customer_idx" ON "bill" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "bill_status_direction_idx" ON "bill" USING btree ("status","direction");--> statement-breakpoint
CREATE INDEX "payment_customer_idx" ON "payment" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payment_approval_idx" ON "payment" USING btree ("approval");
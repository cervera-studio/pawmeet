DROP INDEX IF EXISTS "analytics_daily_date_metric_idx";--> statement-breakpoint
ALTER TABLE "analytics_daily_metrics" ADD CONSTRAINT "analytics_daily_metrics_date_metric_name_pk" PRIMARY KEY("date","metric_name");--> statement-breakpoint
CREATE INDEX "badges_dog_id_idx" ON "badges" USING btree ("dog_id");--> statement-breakpoint
CREATE INDEX "walk_feedback_walk_idx" ON "walk_feedback" USING btree ("walk_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_message_reads_event_user_idx" ON "group_message_reads" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "swipes_swiped_dog_id_idx" ON "swipes" USING btree ("swiped_dog_id");--> statement-breakpoint
CREATE INDEX "org_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_hash_idx" ON "verification_tokens" USING btree ("token_hash");
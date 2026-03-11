CREATE TABLE "analytics_daily_metrics" (
	"date" varchar(10) NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_no_self_block" CHECK ("user_blocks"."blocker_id" != "user_blocks"."blocked_id")
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_no_self_follow" CHECK ("user_follows"."follower_id" != "user_follows"."following_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "followers_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "following_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_date_metric_idx" ON "analytics_daily_metrics" USING btree ("date","metric_name");--> statement-breakpoint
CREATE INDEX "analytics_daily_metric_name_idx" ON "analytics_daily_metrics" USING btree ("metric_name");--> statement-breakpoint
CREATE UNIQUE INDEX "user_blocks_pair_idx" ON "user_blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_follows_pair_idx" ON "user_follows" USING btree ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX "user_follows_follower_idx" ON "user_follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "user_follows_following_idx" ON "user_follows" USING btree ("following_id");--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_role_valid" CHECK ("admin_users"."role" IN ('viewer', 'moderator', 'admin', 'super_admin'));--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_platform_valid" CHECK ("analytics_events"."platform" IN ('ios', 'android', 'web'));--> statement-breakpoint
ALTER TABLE "breeds" ADD CONSTRAINT "breeds_size_category_valid" CHECK ("breeds"."size_category" IS NULL OR "breeds"."size_category" IN ('toy', 'piccola', 'media', 'grande', 'gigante'));--> statement-breakpoint
ALTER TABLE "breeds" ADD CONSTRAINT "breeds_avg_weight_positive" CHECK ("breeds"."avg_weight_kg" IS NULL OR "breeds"."avg_weight_kg" > 0);--> statement-breakpoint
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_direction_valid" CHECK ("swipe_score_logs"."direction" IN ('like', 'pass'));--> statement-breakpoint
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_size_score_range" CHECK ("swipe_score_logs"."size_score" >= 0 AND "swipe_score_logs"."size_score" <= 1);--> statement-breakpoint
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_energy_score_range" CHECK ("swipe_score_logs"."energy_score" >= 0 AND "swipe_score_logs"."energy_score" <= 1);--> statement-breakpoint
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_behavior_score_range" CHECK ("swipe_score_logs"."behavior_score" >= 0 AND "swipe_score_logs"."behavior_score" <= 1);--> statement-breakpoint
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_walk_score_range" CHECK ("swipe_score_logs"."walk_score" >= 0 AND "swipe_score_logs"."walk_score" <= 1);--> statement-breakpoint
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_distance_score_range" CHECK ("swipe_score_logs"."distance_score" >= 0 AND "swipe_score_logs"."distance_score" <= 1);--> statement-breakpoint
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_leash_score_range" CHECK ("swipe_score_logs"."leash_score" >= 0 AND "swipe_score_logs"."leash_score" <= 1);--> statement-breakpoint
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_overall_score_range" CHECK ("swipe_score_logs"."overall_score" >= 0 AND "swipe_score_logs"."overall_score" <= 1);--> statement-breakpoint
ALTER TABLE "user_activity_windows" ADD CONSTRAINT "user_activity_windows_day_range" CHECK ("user_activity_windows"."day_of_week" >= 0 AND "user_activity_windows"."day_of_week" <= 6);--> statement-breakpoint
ALTER TABLE "user_activity_windows" ADD CONSTRAINT "user_activity_windows_hour_range" CHECK ("user_activity_windows"."hour_of_day" >= 0 AND "user_activity_windows"."hour_of_day" <= 23);--> statement-breakpoint
ALTER TABLE "user_activity_windows" ADD CONSTRAINT "user_activity_windows_count_positive" CHECK ("user_activity_windows"."activity_count" >= 1);--> statement-breakpoint
ALTER TABLE "user_matching_preferences" ADD CONSTRAINT "user_matching_prefs_weight_size_range" CHECK ("user_matching_preferences"."weight_size" >= 0 AND "user_matching_preferences"."weight_size" <= 1);--> statement-breakpoint
ALTER TABLE "user_matching_preferences" ADD CONSTRAINT "user_matching_prefs_weight_energy_range" CHECK ("user_matching_preferences"."weight_energy" >= 0 AND "user_matching_preferences"."weight_energy" <= 1);--> statement-breakpoint
ALTER TABLE "user_matching_preferences" ADD CONSTRAINT "user_matching_prefs_weight_behavior_range" CHECK ("user_matching_preferences"."weight_behavior" >= 0 AND "user_matching_preferences"."weight_behavior" <= 1);--> statement-breakpoint
ALTER TABLE "user_matching_preferences" ADD CONSTRAINT "user_matching_prefs_weight_walk_range" CHECK ("user_matching_preferences"."weight_walk" >= 0 AND "user_matching_preferences"."weight_walk" <= 1);--> statement-breakpoint
ALTER TABLE "user_matching_preferences" ADD CONSTRAINT "user_matching_prefs_weight_distance_range" CHECK ("user_matching_preferences"."weight_distance" >= 0 AND "user_matching_preferences"."weight_distance" <= 1);--> statement-breakpoint
ALTER TABLE "user_matching_preferences" ADD CONSTRAINT "user_matching_prefs_weight_leash_range" CHECK ("user_matching_preferences"."weight_leash" >= 0 AND "user_matching_preferences"."weight_leash" <= 1);--> statement-breakpoint
ALTER TABLE "user_matching_preferences" ADD CONSTRAINT "user_matching_prefs_sample_size_non_negative" CHECK ("user_matching_preferences"."sample_size" >= 0);--> statement-breakpoint
ALTER TABLE "user_matching_preferences" ADD CONSTRAINT "user_matching_prefs_success_rate_range" CHECK ("user_matching_preferences"."success_rate" >= 0 AND "user_matching_preferences"."success_rate" <= 1);--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_type_valid" CHECK ("user_consents"."consent_type" IN ('analytics', 'ab_testing', 'error_tracking', 'marketing'));--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_source_valid" CHECK ("user_consents"."source" IN ('mobile_onboarding', 'mobile_settings', 'web_banner'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_followers_count_non_negative" CHECK ("users"."followers_count" >= 0);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_following_count_non_negative" CHECK ("users"."following_count" >= 0);--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_type_valid" CHECK ("verification_tokens"."type" IN ('email_verification', 'password_reset'));
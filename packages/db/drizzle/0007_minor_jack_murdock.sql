CREATE TABLE "message_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar(10) NOT NULL,
	"content_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_reactions_type_valid" CHECK ("content_reactions"."content_type" IN ('post', 'comment', 'story'))
);
--> statement-breakpoint
CREATE TABLE "hashtags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hashtags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "post_hashtags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"hashtag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_metrics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_name" varchar(100) NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"variant" varchar(50) NOT NULL,
	"user_count" integer DEFAULT 0 NOT NULL,
	"total_discoveries" integer DEFAULT 0 NOT NULL,
	"total_likes" integer DEFAULT 0 NOT NULL,
	"total_matches" integer DEFAULT 0 NOT NULL,
	"total_walks_completed" integer DEFAULT 0 NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"avg_compatibility_score" double precision,
	"avg_match_rate" double precision,
	"retained_d7" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ml_model_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(50) NOT NULL,
	"r2_path" varchar(500) NOT NULL,
	"training_samples_count" integer NOT NULL,
	"metrics" jsonb,
	"feature_schema" jsonb,
	"hyperparameters" jsonb,
	"is_active" boolean DEFAULT false NOT NULL,
	"promoted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ml_model_registry_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "ml_training_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"dog_a_id" uuid NOT NULL,
	"dog_b_id" uuid NOT NULL,
	"feature_vector" jsonb NOT NULL,
	"outcome_label" double precision NOT NULL,
	"label_version" integer DEFAULT 1 NOT NULL,
	"matured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ml_training_samples_outcome_label_range" CHECK ("ml_training_samples"."outcome_label" >= -0.3 AND "ml_training_samples"."outcome_label" <= 1.0)
);
--> statement-breakpoint
CREATE TABLE "model_performance_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"total_predictions" integer DEFAULT 0 NOT NULL,
	"total_matches" integer DEFAULT 0 NOT NULL,
	"avg_overall_score" double precision,
	"score_buckets" jsonb,
	"weight_distribution" jsonb,
	"success_rate_distribution" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"current_length" integer DEFAULT 0 NOT NULL,
	"longest_length" integer DEFAULT 0 NOT NULL,
	"last_activity_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "streaks_user_id_type_unique" UNIQUE("user_id","type")
);
--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reactions" ADD CONSTRAINT "content_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_hashtag_id_hashtags_id_fk" FOREIGN KEY ("hashtag_id") REFERENCES "public"."hashtags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ml_training_samples" ADD CONSTRAINT "ml_training_samples_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ml_training_samples" ADD CONSTRAINT "ml_training_samples_dog_a_id_dog_profiles_id_fk" FOREIGN KEY ("dog_a_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ml_training_samples" ADD CONSTRAINT "ml_training_samples_dog_b_id_dog_profiles_id_fk" FOREIGN KEY ("dog_b_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_message_reactions_message_id" ON "message_reactions" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_message_reactions_unique" ON "message_reactions" USING btree ("message_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "content_reactions_content_idx" ON "content_reactions" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "content_reactions_user_idx" ON "content_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_reactions_unique" ON "content_reactions" USING btree ("content_type","content_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "hashtags_usage_count_idx" ON "hashtags" USING btree ("usage_count");--> statement-breakpoint
CREATE UNIQUE INDEX "post_hashtags_unique" ON "post_hashtags" USING btree ("post_id","hashtag_id");--> statement-breakpoint
CREATE INDEX "post_hashtags_hashtag_idx" ON "post_hashtags" USING btree ("hashtag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_metrics_snapshots_name_date_variant_idx" ON "experiment_metrics_snapshots" USING btree ("experiment_name","snapshot_date","variant");--> statement-breakpoint
CREATE INDEX "experiment_metrics_snapshots_date_idx" ON "experiment_metrics_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "ml_model_registry_is_active_idx" ON "ml_model_registry" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ml_training_samples_matured_at_idx" ON "ml_training_samples" USING btree ("matured_at");--> statement-breakpoint
CREATE INDEX "ml_training_samples_label_version_idx" ON "ml_training_samples" USING btree ("label_version");--> statement-breakpoint
CREATE UNIQUE INDEX "model_performance_daily_snapshot_date_idx" ON "model_performance_daily" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_notification_log_user_id" ON "notification_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notification_log_user_created" ON "notification_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "streaks_user_idx" ON "streaks" USING btree ("user_id");
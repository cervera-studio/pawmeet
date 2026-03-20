CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(100),
	"changes" jsonb,
	"reason" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"role" varchar(20) DEFAULT 'viewer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email"),
	CONSTRAINT "admin_users_role_valid" CHECK ("admin_users"."role" IN ('viewer', 'moderator', 'admin', 'super_admin'))
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_event_id" varchar(64) NOT NULL,
	"user_id" uuid,
	"session_id" varchar(64),
	"event_name" varchar(100) NOT NULL,
	"properties" jsonb,
	"client_timestamp" timestamp with time zone NOT NULL,
	"server_timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"platform" varchar(10) NOT NULL,
	"app_version" varchar(20),
	"screen_name" varchar(100),
	"schema_version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "analytics_events_client_event_id_unique" UNIQUE("client_event_id"),
	CONSTRAINT "analytics_events_platform_valid" CHECK ("analytics_events"."platform" IN ('ios', 'android', 'web', 'server'))
);
--> statement-breakpoint
CREATE TABLE "analytics_daily_metrics" (
	"date" varchar(10) NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dog_id" uuid NOT NULL,
	"type" text NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badges_dog_id_type_unique" UNIQUE("dog_id","type")
);
--> statement-breakpoint
CREATE TABLE "breeds" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(100) NOT NULL,
	"group" varchar(50),
	"size_category" varchar(10),
	"avg_weight_kg" integer,
	"energy" integer,
	"playfulness" integer,
	"trainability" integer,
	"barking" integer,
	"good_with_other_dogs" integer,
	"good_with_children" integer,
	"good_with_strangers" integer,
	"protectiveness" integer,
	"shedding" integer,
	"grooming" integer,
	CONSTRAINT "breeds_code_unique" UNIQUE("code"),
	CONSTRAINT "breeds_size_category_valid" CHECK ("breeds"."size_category" IS NULL OR "breeds"."size_category" IN ('toy', 'small', 'medium', 'large', 'giant')),
	CONSTRAINT "breeds_avg_weight_positive" CHECK ("breeds"."avg_weight_kg" IS NULL OR "breeds"."avg_weight_kg" > 0),
	CONSTRAINT "breeds_scores_range" CHECK ("breeds"."energy" IS NULL OR ("breeds"."energy" BETWEEN 1 AND 5))
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"media_url" text,
	"status" varchar(10) DEFAULT 'sent' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_status_valid" CHECK ("messages"."status" IN ('sent', 'delivered', 'read'))
);
--> statement-breakpoint
CREATE TABLE "dog_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dog_id" uuid NOT NULL,
	"embedding" vector(768) NOT NULL,
	"model_version" varchar(50) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dog_embeddings_dog_id_unique" UNIQUE("dog_id")
);
--> statement-breakpoint
CREATE TABLE "dog_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dog_id" uuid NOT NULL,
	"url" text NOT NULL,
	"position" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"moderation_status" varchar(10) DEFAULT 'pending' NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dog_photos_position_range" CHECK ("dog_photos"."position" >= 0 AND "dog_photos"."position" <= 5),
	CONSTRAINT "dog_photos_moderation_status_valid" CHECK ("dog_photos"."moderation_status" IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "dog_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"birth_date" timestamp with time zone NOT NULL,
	"breed" varchar(100) NOT NULL,
	"breed_secondary" varchar(100),
	"size" varchar(10) NOT NULL,
	"weight_kg" double precision NOT NULL,
	"gender" varchar(10) NOT NULL,
	"is_neutered" boolean NOT NULL,
	"energy_level" varchar(15) NOT NULL,
	"behavior_with_dogs" varchar(20) NOT NULL,
	"behavior_with_people" varchar(20) NOT NULL,
	"leash_behavior" varchar(20) NOT NULL,
	"recall_reliability" varchar(20),
	"bio" text,
	"walk_pref_time" jsonb NOT NULL,
	"walk_pref_duration_min" integer NOT NULL,
	"walk_pref_duration_max" integer NOT NULL,
	"walk_pref_terrain" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dog_profiles_size_valid" CHECK ("dog_profiles"."size" IN ('toy', 'small', 'medium', 'large', 'giant')),
	CONSTRAINT "dog_profiles_weight_range" CHECK ("dog_profiles"."weight_kg" >= 0.5 AND "dog_profiles"."weight_kg" <= 100),
	CONSTRAINT "dog_profiles_gender_valid" CHECK ("dog_profiles"."gender" IN ('male', 'female')),
	CONSTRAINT "dog_profiles_energy_level_valid" CHECK ("dog_profiles"."energy_level" IN ('low', 'medium', 'high', 'very_high')),
	CONSTRAINT "dog_profiles_behavior_dogs_valid" CHECK ("dog_profiles"."behavior_with_dogs" IN ('very_friendly', 'friendly', 'selective', 'reactive')),
	CONSTRAINT "dog_profiles_behavior_people_valid" CHECK ("dog_profiles"."behavior_with_people" IN ('very_friendly', 'friendly', 'shy', 'wary')),
	CONSTRAINT "dog_profiles_leash_behavior_valid" CHECK ("dog_profiles"."leash_behavior" IN ('excellent', 'good', 'in_training', 'difficult')),
	CONSTRAINT "dog_profiles_recall_valid" CHECK ("dog_profiles"."recall_reliability" IS NULL OR "dog_profiles"."recall_reliability" IN ('reliable', 'partial', 'unreliable')),
	CONSTRAINT "dog_profiles_walk_duration_min_range" CHECK ("dog_profiles"."walk_pref_duration_min" >= 15 AND "dog_profiles"."walk_pref_duration_min" <= 180),
	CONSTRAINT "dog_profiles_walk_duration_max_range" CHECK ("dog_profiles"."walk_pref_duration_max" >= 15 AND "dog_profiles"."walk_pref_duration_max" <= 180),
	CONSTRAINT "dog_profiles_walk_duration_order" CHECK ("dog_profiles"."walk_pref_duration_min" <= "dog_profiles"."walk_pref_duration_max")
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"relationship" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emergency_contacts_name_not_empty" CHECK (length(trim("emergency_contacts"."name")) > 0),
	CONSTRAINT "emergency_contacts_phone_not_empty" CHECK (length(trim("emergency_contacts"."phone")) > 0)
);
--> statement-breakpoint
CREATE TABLE "walk_safety_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"walk_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"latitude" text,
	"longitude" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "walk_safety_checkins_type_valid" CHECK ("walk_safety_checkins"."type" IN ('checkin', 'sos', 'auto_alert'))
);
--> statement-breakpoint
CREATE TABLE "event_sponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"tier" varchar(30) NOT NULL,
	"logo_placement" varchar(30) DEFAULT 'footer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_sponsors_tier_valid" CHECK ("event_sponsors"."tier" IN ('title', 'gold', 'silver', 'partner')),
	CONSTRAINT "event_sponsors_logo_placement_valid" CHECK ("event_sponsors"."logo_placement" IN ('header', 'footer', 'banner'))
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
CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"content_type" varchar(10) NOT NULL,
	"content_id" uuid NOT NULL,
	"reason" varchar(20) NOT NULL,
	"description" text,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_reports_content_type_valid" CHECK ("content_reports"."content_type" IN ('post', 'comment', 'story')),
	CONSTRAINT "content_reports_reason_valid" CHECK ("content_reports"."reason" IN ('inappropriate', 'spam', 'harassment', 'violence', 'other')),
	CONSTRAINT "content_reports_status_valid" CHECK ("content_reports"."status" IN ('pending', 'reviewed', 'dismissed'))
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
CREATE TABLE "post_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_hashtags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"hashtag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"url" text NOT NULL,
	"media_type" varchar(10) NOT NULL,
	"thumbnail_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"moderation_status" varchar(10) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_media_type_valid" CHECK ("post_media"."media_type" IN ('photo', 'video')),
	CONSTRAINT "post_media_position_range" CHECK ("post_media"."position" >= 0 AND "post_media"."position" <= 9),
	CONSTRAINT "post_media_moderation_status_valid" CHECK ("post_media"."moderation_status" IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"tagged_user_id" uuid,
	"tagged_dog_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"caption" text,
	"latitude" double precision,
	"longitude" double precision,
	"walk_id" uuid,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"moderation_status" varchar(10) DEFAULT 'pending' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_likes_count_non_negative" CHECK ("posts"."likes_count" >= 0),
	CONSTRAINT "posts_comments_count_non_negative" CHECK ("posts"."comments_count" >= 0),
	CONSTRAINT "posts_latitude_range" CHECK ("posts"."latitude" >= -90 AND "posts"."latitude" <= 90),
	CONSTRAINT "posts_longitude_range" CHECK ("posts"."longitude" >= -180 AND "posts"."longitude" <= 180),
	CONSTRAINT "posts_moderation_status_valid" CHECK ("posts"."moderation_status" IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"media_url" text NOT NULL,
	"media_type" varchar(10) NOT NULL,
	"thumbnail_url" text,
	"expires_at" timestamp with time zone NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stories_media_type_valid" CHECK ("stories"."media_type" IN ('photo', 'video')),
	CONSTRAINT "stories_view_count_non_negative" CHECK ("stories"."view_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "story_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"viewer_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "walk_albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"walk_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"is_finalized" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "walk_albums_walk_id_unique" UNIQUE("walk_id")
);
--> statement-breakpoint
CREATE TABLE "walk_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"walk_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_dog_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "walk_feedback_walk_user_unique" UNIQUE("walk_id","from_user_id"),
	CONSTRAINT "walk_feedback_rating_range" CHECK ("walk_feedback"."rating" >= 1 AND "walk_feedback"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "daily_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"steps_count" integer DEFAULT 0 NOT NULL,
	"walk_distance_km" double precision DEFAULT 0 NOT NULL,
	"walk_duration_min" integer DEFAULT 0 NOT NULL,
	"walk_count" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'app' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_activity_steps_non_negative" CHECK ("daily_activity"."steps_count" >= 0),
	CONSTRAINT "daily_activity_distance_non_negative" CHECK ("daily_activity"."walk_distance_km" >= 0),
	CONSTRAINT "daily_activity_duration_non_negative" CHECK ("daily_activity"."walk_duration_min" >= 0),
	CONSTRAINT "daily_activity_walk_count_non_negative" CHECK ("daily_activity"."walk_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "walk_track_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"altitude" double precision,
	"timestamp" timestamp with time zone NOT NULL,
	"speed_kmh" double precision,
	"position" integer NOT NULL,
	CONSTRAINT "walk_track_points_latitude_range" CHECK ("walk_track_points"."latitude" >= -90 AND "walk_track_points"."latitude" <= 90),
	CONSTRAINT "walk_track_points_longitude_range" CHECK ("walk_track_points"."longitude" >= -180 AND "walk_track_points"."longitude" <= 180),
	CONSTRAINT "walk_track_points_position_non_negative" CHECK ("walk_track_points"."position" >= 0),
	CONSTRAINT "walk_track_points_speed_non_negative" CHECK ("walk_track_points"."speed_kmh" IS NULL OR "walk_track_points"."speed_kmh" >= 0)
);
--> statement-breakpoint
CREATE TABLE "walk_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"walk_id" uuid,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"distance_km" double precision DEFAULT 0 NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"avg_speed_kmh" double precision DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "walk_tracks_distance_non_negative" CHECK ("walk_tracks"."distance_km" >= 0),
	CONSTRAINT "walk_tracks_duration_non_negative" CHECK ("walk_tracks"."duration_minutes" >= 0),
	CONSTRAINT "walk_tracks_avg_speed_non_negative" CHECK ("walk_tracks"."avg_speed_kmh" >= 0)
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_user_id_type_unique" UNIQUE("user_id","type")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"target_value" integer NOT NULL,
	"xp_reward" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenges_target_value_positive" CHECK ("challenges"."target_value" > 0),
	CONSTRAINT "challenges_xp_reward_positive" CHECK ("challenges"."xp_reward" > 0),
	CONSTRAINT "challenges_dates_order" CHECK ("challenges"."starts_at" < "challenges"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "user_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_challenges_user_id_challenge_id_unique" UNIQUE("user_id","challenge_id"),
	CONSTRAINT "user_challenges_progress_non_negative" CHECK ("user_challenges"."progress" >= 0)
);
--> statement-breakpoint
CREATE TABLE "xp_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"points" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xp_transactions_points_positive" CHECK ("xp_transactions"."points" > 0)
);
--> statement-breakpoint
CREATE TABLE "gdpr_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"r2_key" text,
	"expires_at" timestamp with time zone,
	"error_message" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gdpr_exports_status_valid" CHECK ("gdpr_exports"."status" IN ('pending', 'processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "group_event_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"dog_id" uuid NOT NULL,
	"status" varchar(15) DEFAULT 'accepted' NOT NULL,
	"is_organizer" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_event_participants_status_valid" CHECK ("group_event_participants"."status" IN ('pending', 'accepted', 'declined', 'removed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "group_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"location" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"max_participants" integer DEFAULT 10 NOT NULL,
	"visibility" varchar(15) DEFAULT 'public' NOT NULL,
	"status" varchar(15) DEFAULT 'scheduled' NOT NULL,
	"recurrence_rule" varchar(255),
	"recurrence_end" timestamp with time zone,
	"parent_event_id" uuid,
	"category" varchar(20) DEFAULT 'walk' NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"cover_image_url" varchar(500),
	"organization_id" uuid,
	"is_official" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_events_duration_range" CHECK ("group_events"."duration_min" >= 15 AND "group_events"."duration_min" <= 180),
	CONSTRAINT "group_events_latitude_range" CHECK ("group_events"."latitude" >= -90 AND "group_events"."latitude" <= 90),
	CONSTRAINT "group_events_longitude_range" CHECK ("group_events"."longitude" >= -180 AND "group_events"."longitude" <= 180),
	CONSTRAINT "group_events_max_participants_range" CHECK ("group_events"."max_participants" >= 2 AND "group_events"."max_participants" <= 500),
	CONSTRAINT "group_events_visibility_valid" CHECK ("group_events"."visibility" IN ('public', 'friends_only', 'invite_only')),
	CONSTRAINT "group_events_status_valid" CHECK ("group_events"."status" IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'template')),
	CONSTRAINT "group_events_category_valid" CHECK ("group_events"."category" IN ('walk', 'meetup', 'training'))
);
--> statement-breakpoint
CREATE TABLE "group_message_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"media_url" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dog_a_id" uuid NOT NULL,
	"dog_b_id" uuid NOT NULL,
	"compatibility_score" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_matches_dog_pair" UNIQUE("dog_a_id","dog_b_id"),
	CONSTRAINT "matches_compatibility_score_range" CHECK ("matches"."compatibility_score" >= 0 AND "matches"."compatibility_score" <= 1),
	CONSTRAINT "matches_dog_pair_ordered" CHECK ("matches"."dog_a_id" < "matches"."dog_b_id")
);
--> statement-breakpoint
CREATE TABLE "swipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"swiper_dog_id" uuid NOT NULL,
	"swiped_dog_id" uuid NOT NULL,
	"direction" varchar(5) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_swipes_pair" UNIQUE("swiper_dog_id","swiped_dog_id"),
	CONSTRAINT "swipes_direction_valid" CHECK ("swipes"."direction" IN ('like', 'pass'))
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
CREATE TABLE "match_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"interaction_type" varchar(30) NOT NULL,
	"metadata" jsonb,
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
CREATE TABLE "swipe_score_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"swiper_dog_id" uuid NOT NULL,
	"swiped_dog_id" uuid NOT NULL,
	"direction" varchar(5) NOT NULL,
	"size_score" double precision NOT NULL,
	"energy_score" double precision NOT NULL,
	"behavior_score" double precision NOT NULL,
	"walk_score" double precision NOT NULL,
	"distance_score" double precision NOT NULL,
	"leash_score" double precision NOT NULL,
	"overall_score" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "swipe_score_logs_direction_valid" CHECK ("swipe_score_logs"."direction" IN ('like', 'pass')),
	CONSTRAINT "swipe_score_logs_size_score_range" CHECK ("swipe_score_logs"."size_score" >= 0 AND "swipe_score_logs"."size_score" <= 1),
	CONSTRAINT "swipe_score_logs_energy_score_range" CHECK ("swipe_score_logs"."energy_score" >= 0 AND "swipe_score_logs"."energy_score" <= 1),
	CONSTRAINT "swipe_score_logs_behavior_score_range" CHECK ("swipe_score_logs"."behavior_score" >= 0 AND "swipe_score_logs"."behavior_score" <= 1),
	CONSTRAINT "swipe_score_logs_walk_score_range" CHECK ("swipe_score_logs"."walk_score" >= 0 AND "swipe_score_logs"."walk_score" <= 1),
	CONSTRAINT "swipe_score_logs_distance_score_range" CHECK ("swipe_score_logs"."distance_score" >= 0 AND "swipe_score_logs"."distance_score" <= 1),
	CONSTRAINT "swipe_score_logs_leash_score_range" CHECK ("swipe_score_logs"."leash_score" >= 0 AND "swipe_score_logs"."leash_score" <= 1),
	CONSTRAINT "swipe_score_logs_overall_score_range" CHECK ("swipe_score_logs"."overall_score" >= 0 AND "swipe_score_logs"."overall_score" <= 1)
);
--> statement-breakpoint
CREATE TABLE "user_activity_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"hour_of_day" integer NOT NULL,
	"activity_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_activity_windows_day_range" CHECK ("user_activity_windows"."day_of_week" >= 0 AND "user_activity_windows"."day_of_week" <= 6),
	CONSTRAINT "user_activity_windows_hour_range" CHECK ("user_activity_windows"."hour_of_day" >= 0 AND "user_activity_windows"."hour_of_day" <= 23),
	CONSTRAINT "user_activity_windows_count_positive" CHECK ("user_activity_windows"."activity_count" >= 1)
);
--> statement-breakpoint
CREATE TABLE "user_matching_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"weight_size" double precision DEFAULT 0.25 NOT NULL,
	"weight_energy" double precision DEFAULT 0.25 NOT NULL,
	"weight_behavior" double precision DEFAULT 0.2 NOT NULL,
	"weight_walk" double precision DEFAULT 0.15 NOT NULL,
	"weight_distance" double precision DEFAULT 0.1 NOT NULL,
	"weight_leash" double precision DEFAULT 0.05 NOT NULL,
	"sample_size" integer DEFAULT 0 NOT NULL,
	"success_rate" double precision DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_matching_preferences_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_matching_prefs_weight_size_range" CHECK ("user_matching_preferences"."weight_size" >= 0 AND "user_matching_preferences"."weight_size" <= 1),
	CONSTRAINT "user_matching_prefs_weight_energy_range" CHECK ("user_matching_preferences"."weight_energy" >= 0 AND "user_matching_preferences"."weight_energy" <= 1),
	CONSTRAINT "user_matching_prefs_weight_behavior_range" CHECK ("user_matching_preferences"."weight_behavior" >= 0 AND "user_matching_preferences"."weight_behavior" <= 1),
	CONSTRAINT "user_matching_prefs_weight_walk_range" CHECK ("user_matching_preferences"."weight_walk" >= 0 AND "user_matching_preferences"."weight_walk" <= 1),
	CONSTRAINT "user_matching_prefs_weight_distance_range" CHECK ("user_matching_preferences"."weight_distance" >= 0 AND "user_matching_preferences"."weight_distance" <= 1),
	CONSTRAINT "user_matching_prefs_weight_leash_range" CHECK ("user_matching_preferences"."weight_leash" >= 0 AND "user_matching_preferences"."weight_leash" <= 1),
	CONSTRAINT "user_matching_prefs_sample_size_non_negative" CHECK ("user_matching_preferences"."sample_size" >= 0),
	CONSTRAINT "user_matching_prefs_success_rate_range" CHECK ("user_matching_preferences"."success_rate" >= 0 AND "user_matching_preferences"."success_rate" <= 1)
);
--> statement-breakpoint
CREATE TABLE "dog_mood_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dog_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"tags" text[] NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dog_mood_log_dog_track_unique" UNIQUE("dog_id","track_id"),
	CONSTRAINT "mood_log_rating_range" CHECK ("dog_mood_logs"."rating" >= 1 AND "dog_mood_logs"."rating" <= 5)
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
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(30) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_role_valid" CHECK ("organization_members"."role" IN ('owner', 'admin', 'member'))
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"type" varchar(30) NOT NULL,
	"description" text,
	"logo_url" varchar(500),
	"website_url" varchar(500),
	"contact_email" varchar(255),
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_type_valid" CHECK ("organizations"."type" IN ('pawmeet_team', 'association', 'educator', 'brand'))
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reported_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_by" uuid,
	"resolved_action" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_reason_valid" CHECK ("reports"."reason" IN ('inappropriate', 'fake', 'harassment', 'spam', 'other')),
	CONSTRAINT "reports_status_valid" CHECK ("reports"."status" IN ('pending', 'resolved', 'dismissed')),
	CONSTRAINT "reports_resolved_action_valid" CHECK ("reports"."resolved_action" IS NULL OR "reports"."resolved_action" IN ('dismiss', 'warn', 'suspend', 'ban'))
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
CREATE TABLE "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_no_self_block" CHECK ("user_blocks"."blocker_id" != "user_blocks"."blocked_id")
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_type" varchar(30) NOT NULL,
	"consent_version" varchar(10) DEFAULT 'v1.0' NOT NULL,
	"granted" boolean NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"source" varchar(30) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_consents_user_type_uniq" UNIQUE("user_id","consent_type"),
	CONSTRAINT "user_consents_type_valid" CHECK ("user_consents"."consent_type" IN ('analytics', 'ab_testing', 'error_tracking', 'marketing', 'ai_training')),
	CONSTRAINT "user_consents_source_valid" CHECK ("user_consents"."source" IN ('mobile_onboarding', 'mobile_settings', 'web_banner'))
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(50) NOT NULL,
	"auth_provider" varchar(10) DEFAULT 'email' NOT NULL,
	"password_hash" text,
	"avatar_url" text,
	"latitude" double precision,
	"longitude" double precision,
	"location_updated_at" timestamp with time zone,
	"search_radius_km" integer DEFAULT 10 NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notification_prefs" jsonb DEFAULT '{"matches":true,"messages":true,"reminders":true,"feed":true,"nearby":true}'::jsonb,
	"date_of_birth" date,
	"locale" varchar(5) DEFAULT 'it' NOT NULL,
	"push_token" text,
	"last_login_at" timestamp with time zone,
	"deletion_scheduled_at" timestamp with time zone,
	"followers_count" integer DEFAULT 0 NOT NULL,
	"following_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_latitude_range" CHECK ("users"."latitude" >= -90 AND "users"."latitude" <= 90),
	CONSTRAINT "users_longitude_range" CHECK ("users"."longitude" >= -180 AND "users"."longitude" <= 180),
	CONSTRAINT "users_search_radius_range" CHECK ("users"."search_radius_km" >= 1 AND "users"."search_radius_km" <= 50),
	CONSTRAINT "users_auth_provider_valid" CHECK ("users"."auth_provider" IN ('email', 'apple', 'google')),
	CONSTRAINT "users_dob_in_past" CHECK ("users"."date_of_birth" IS NULL OR "users"."date_of_birth" <= CURRENT_DATE),
	CONSTRAINT "users_followers_count_non_negative" CHECK ("users"."followers_count" >= 0),
	CONSTRAINT "users_following_count_non_negative" CHECK ("users"."following_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"type" varchar(30) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_type_valid" CHECK ("verification_tokens"."type" IN ('email_verification', 'password_reset'))
);
--> statement-breakpoint
CREATE TABLE "walks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 30 NOT NULL,
	"location" text,
	"latitude" double precision,
	"longitude" double precision,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "walks_duration_range" CHECK ("walks"."duration_min" >= 15 AND "walks"."duration_min" <= 180),
	CONSTRAINT "walks_latitude_range" CHECK ("walks"."latitude" >= -90 AND "walks"."latitude" <= 90),
	CONSTRAINT "walks_longitude_range" CHECK ("walks"."longitude" >= -180 AND "walks"."longitude" <= 180),
	CONSTRAINT "walks_status_valid" CHECK ("walks"."status" IN ('pending', 'accepted', 'declined', 'cancelled', 'completed'))
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_dog_id_dog_profiles_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dog_embeddings" ADD CONSTRAINT "dog_embeddings_dog_id_dog_profiles_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dog_photos" ADD CONSTRAINT "dog_photos_dog_id_dog_profiles_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dog_profiles" ADD CONSTRAINT "dog_profiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_safety_checkins" ADD CONSTRAINT "walk_safety_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD CONSTRAINT "event_sponsors_event_id_group_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."group_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD CONSTRAINT "event_sponsors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reactions" ADD CONSTRAINT "content_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_id_post_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_hashtag_id_hashtags_id_fk" FOREIGN KEY ("hashtag_id") REFERENCES "public"."hashtags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tagged_user_id_users_id_fk" FOREIGN KEY ("tagged_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tagged_dog_id_dog_profiles_id_fk" FOREIGN KEY ("tagged_dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_albums" ADD CONSTRAINT "walk_albums_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_feedback" ADD CONSTRAINT "walk_feedback_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_feedback" ADD CONSTRAINT "walk_feedback_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_feedback" ADD CONSTRAINT "walk_feedback_to_dog_id_dog_profiles_id_fk" FOREIGN KEY ("to_dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_activity" ADD CONSTRAINT "daily_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_track_points" ADD CONSTRAINT "walk_track_points_track_id_walk_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."walk_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_tracks" ADD CONSTRAINT "walk_tracks_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_tracks" ADD CONSTRAINT "walk_tracks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdpr_exports" ADD CONSTRAINT "gdpr_exports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_event_participants" ADD CONSTRAINT "group_event_participants_event_id_group_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."group_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_event_participants" ADD CONSTRAINT "group_event_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_event_participants" ADD CONSTRAINT "group_event_participants_dog_id_dog_profiles_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_parent_event_id_group_events_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "public"."group_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_message_reads" ADD CONSTRAINT "group_message_reads_event_id_group_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."group_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_message_reads" ADD CONSTRAINT "group_message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_event_id_group_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."group_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_dog_a_id_dog_profiles_id_fk" FOREIGN KEY ("dog_a_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_dog_b_id_dog_profiles_id_fk" FOREIGN KEY ("dog_b_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_swiper_dog_id_dog_profiles_id_fk" FOREIGN KEY ("swiper_dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_swiped_dog_id_dog_profiles_id_fk" FOREIGN KEY ("swiped_dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_interactions" ADD CONSTRAINT "match_interactions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_interactions" ADD CONSTRAINT "match_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ml_training_samples" ADD CONSTRAINT "ml_training_samples_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ml_training_samples" ADD CONSTRAINT "ml_training_samples_dog_a_id_dog_profiles_id_fk" FOREIGN KEY ("dog_a_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ml_training_samples" ADD CONSTRAINT "ml_training_samples_dog_b_id_dog_profiles_id_fk" FOREIGN KEY ("dog_b_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_swiper_dog_id_dog_profiles_id_fk" FOREIGN KEY ("swiper_dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_swiped_dog_id_dog_profiles_id_fk" FOREIGN KEY ("swiped_dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_windows" ADD CONSTRAINT "user_activity_windows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_matching_preferences" ADD CONSTRAINT "user_matching_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dog_mood_logs" ADD CONSTRAINT "dog_mood_logs_dog_id_dog_profiles_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dog_mood_logs" ADD CONSTRAINT "dog_mood_logs_track_id_walk_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."walk_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dog_mood_logs" ADD CONSTRAINT "dog_mood_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_verified_by_admin_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walks" ADD CONSTRAINT "walks_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walks" ADD CONSTRAINT "walks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_admin" ON "admin_audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_audit_resource" ON "admin_audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_date" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "admin_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "analytics_events_name_ts_idx" ON "analytics_events" USING btree ("event_name","server_timestamp");--> statement-breakpoint
CREATE INDEX "analytics_events_user_ts_idx" ON "analytics_events" USING btree ("user_id","server_timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_date_metric_idx" ON "analytics_daily_metrics" USING btree ("date","metric_name");--> statement-breakpoint
CREATE INDEX "analytics_daily_metric_name_idx" ON "analytics_daily_metrics" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX "idx_message_reactions_message_id" ON "message_reactions" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_message_reactions_unique" ON "message_reactions" USING btree ("message_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "idx_messages_match_id" ON "messages" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "idx_messages_sender_id" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dog_embeddings_dog_id_idx" ON "dog_embeddings" USING btree ("dog_id");--> statement-breakpoint
CREATE INDEX "dog_embeddings_model_version_idx" ON "dog_embeddings" USING btree ("model_version");--> statement-breakpoint
CREATE INDEX "idx_dog_profiles_owner_id" ON "dog_profiles" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_emergency_contacts_user_id" ON "emergency_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_walk_safety_checkins_walk_id" ON "walk_safety_checkins" USING btree ("walk_id");--> statement-breakpoint
CREATE INDEX "idx_walk_safety_checkins_user_id" ON "walk_safety_checkins" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_sponsors_pair_idx" ON "event_sponsors" USING btree ("event_id","organization_id");--> statement-breakpoint
CREATE INDEX "content_reactions_content_idx" ON "content_reactions" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "content_reactions_user_idx" ON "content_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_reactions_unique" ON "content_reactions" USING btree ("content_type","content_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "content_reports_reporter_idx" ON "content_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "content_reports_reviewed_by_idx" ON "content_reports" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX "hashtags_usage_count_idx" ON "hashtags" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX "post_comments_post_idx" ON "post_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_comments_author_idx" ON "post_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "post_comments_parent_idx" ON "post_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_hashtags_unique" ON "post_hashtags" USING btree ("post_id","hashtag_id");--> statement-breakpoint
CREATE INDEX "post_hashtags_hashtag_idx" ON "post_hashtags" USING btree ("hashtag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_likes_post_user_idx" ON "post_likes" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "post_likes_user_idx" ON "post_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "post_media_post_idx" ON "post_media" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_tags_post_idx" ON "post_tags" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_tags_user_idx" ON "post_tags" USING btree ("tagged_user_id");--> statement-breakpoint
CREATE INDEX "post_tags_dog_idx" ON "post_tags" USING btree ("tagged_dog_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_tags_post_user_unique" ON "post_tags" USING btree ("post_id","tagged_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_tags_post_dog_unique" ON "post_tags" USING btree ("post_id","tagged_dog_id");--> statement-breakpoint
CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "posts_walk_idx" ON "posts" USING btree ("walk_id");--> statement-breakpoint
CREATE INDEX "stories_author_idx" ON "stories" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_stories_expires_at" ON "stories" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "story_views_story_viewer_idx" ON "story_views" USING btree ("story_id","viewer_id");--> statement-breakpoint
CREATE INDEX "story_views_viewer_idx" ON "story_views" USING btree ("viewer_id");--> statement-breakpoint
CREATE INDEX "walk_feedback_from_user_idx" ON "walk_feedback" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "walk_feedback_to_dog_idx" ON "walk_feedback" USING btree ("to_dog_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_activity_user_date_source_idx" ON "daily_activity" USING btree ("user_id","date","source");--> statement-breakpoint
CREATE INDEX "walk_track_points_track_idx" ON "walk_track_points" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "walk_tracks_walk_idx" ON "walk_tracks" USING btree ("walk_id");--> statement-breakpoint
CREATE INDEX "walk_tracks_user_idx" ON "walk_tracks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_challenges_challenge_idx" ON "user_challenges" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "xp_transactions_user_idx" ON "xp_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gdpr_exports_user_idx" ON "gdpr_exports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gdpr_exports_status_idx" ON "gdpr_exports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_event_participants_event_idx" ON "group_event_participants" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "group_event_participants_user_idx" ON "group_event_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_event_participants_dog_idx" ON "group_event_participants" USING btree ("dog_id");--> statement-breakpoint
CREATE INDEX "group_event_participants_event_status_idx" ON "group_event_participants" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "group_events_created_by_idx" ON "group_events" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "group_events_parent_idx" ON "group_events" USING btree ("parent_event_id");--> statement-breakpoint
CREATE INDEX "group_events_category_idx" ON "group_events" USING btree ("category");--> statement-breakpoint
CREATE INDEX "group_events_organization_idx" ON "group_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "group_message_reads_event_idx" ON "group_message_reads" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "group_message_reads_user_idx" ON "group_message_reads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_messages_event_idx" ON "group_messages" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "group_messages_sender_idx" ON "group_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_matches_dog_a_id" ON "matches" USING btree ("dog_a_id");--> statement-breakpoint
CREATE INDEX "idx_matches_dog_b_id" ON "matches" USING btree ("dog_b_id");--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_metrics_snapshots_name_date_variant_idx" ON "experiment_metrics_snapshots" USING btree ("experiment_name","snapshot_date","variant");--> statement-breakpoint
CREATE INDEX "experiment_metrics_snapshots_date_idx" ON "experiment_metrics_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "match_interactions_match_idx" ON "match_interactions" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_interactions_user_idx" ON "match_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ml_model_registry_is_active_idx" ON "ml_model_registry" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ml_training_samples_matured_at_idx" ON "ml_training_samples" USING btree ("matured_at");--> statement-breakpoint
CREATE INDEX "ml_training_samples_label_version_idx" ON "ml_training_samples" USING btree ("label_version");--> statement-breakpoint
CREATE UNIQUE INDEX "model_performance_daily_snapshot_date_idx" ON "model_performance_daily" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "swipe_score_logs_swiper_dog_idx" ON "swipe_score_logs" USING btree ("swiper_dog_id");--> statement-breakpoint
CREATE INDEX "swipe_score_logs_swiped_dog_idx" ON "swipe_score_logs" USING btree ("swiped_dog_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_activity_windows_user_day_hour_idx" ON "user_activity_windows" USING btree ("user_id","day_of_week","hour_of_day");--> statement-breakpoint
CREATE INDEX "dog_mood_log_dog_idx" ON "dog_mood_logs" USING btree ("dog_id");--> statement-breakpoint
CREATE INDEX "dog_mood_log_user_idx" ON "dog_mood_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notification_log_user_id" ON "notification_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notification_log_user_created" ON "notification_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_pair_idx" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reports_reporter_idx" ON "reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "reports_reported_user_idx" ON "reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX "streaks_user_idx" ON "streaks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_blocks_pair_idx" ON "user_blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocker_id" ON "user_blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocked_id" ON "user_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_follows_pair_idx" ON "user_follows" USING btree ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX "user_follows_follower_idx" ON "user_follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "user_follows_following_idx" ON "user_follows" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "verification_tokens_user_idx" ON "verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_walks_match_id" ON "walks" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "idx_walks_created_by" ON "walks" USING btree ("created_by");
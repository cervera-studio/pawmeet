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
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
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
	CONSTRAINT "analytics_events_client_event_id_unique" UNIQUE("client_event_id")
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
	"name" varchar(100) NOT NULL,
	"name_it" varchar(100) NOT NULL,
	"group" varchar(50),
	"size_category" varchar(10),
	"avg_weight_kg" integer,
	CONSTRAINT "breeds_name_unique" UNIQUE("name")
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
	CONSTRAINT "dog_profiles_size_valid" CHECK ("dog_profiles"."size" IN ('toy', 'piccola', 'media', 'grande', 'gigante')),
	CONSTRAINT "dog_profiles_weight_range" CHECK ("dog_profiles"."weight_kg" >= 0.5 AND "dog_profiles"."weight_kg" <= 100),
	CONSTRAINT "dog_profiles_gender_valid" CHECK ("dog_profiles"."gender" IN ('maschio', 'femmina')),
	CONSTRAINT "dog_profiles_energy_level_valid" CHECK ("dog_profiles"."energy_level" IN ('bassa', 'media', 'alta', 'molto_alta')),
	CONSTRAINT "dog_profiles_behavior_dogs_valid" CHECK ("dog_profiles"."behavior_with_dogs" IN ('molto_socievole', 'socievole', 'selettivo', 'reattivo')),
	CONSTRAINT "dog_profiles_behavior_people_valid" CHECK ("dog_profiles"."behavior_with_people" IN ('molto_socievole', 'socievole', 'timido', 'diffidente')),
	CONSTRAINT "dog_profiles_leash_behavior_valid" CHECK ("dog_profiles"."leash_behavior" IN ('eccellente', 'buono', 'in_addestramento', 'difficile')),
	CONSTRAINT "dog_profiles_recall_valid" CHECK ("dog_profiles"."recall_reliability" IS NULL OR "dog_profiles"."recall_reliability" IN ('affidabile', 'parziale', 'non_affidabile')),
	CONSTRAINT "dog_profiles_walk_duration_min_range" CHECK ("dog_profiles"."walk_pref_duration_min" >= 15 AND "dog_profiles"."walk_pref_duration_min" <= 180),
	CONSTRAINT "dog_profiles_walk_duration_max_range" CHECK ("dog_profiles"."walk_pref_duration_max" >= 15 AND "dog_profiles"."walk_pref_duration_max" <= 180),
	CONSTRAINT "dog_profiles_walk_duration_order" CHECK ("dog_profiles"."walk_pref_duration_min" <= "dog_profiles"."walk_pref_duration_max")
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
CREATE TABLE "group_event_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"dog_id" uuid NOT NULL,
	"status" varchar(15) DEFAULT 'accepted' NOT NULL,
	"is_organizer" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_event_participants_status_valid" CHECK ("group_event_participants"."status" IN ('accepted', 'declined', 'removed'))
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
	"visibility" varchar(10) DEFAULT 'public' NOT NULL,
	"status" varchar(15) DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_events_duration_range" CHECK ("group_events"."duration_min" >= 15 AND "group_events"."duration_min" <= 180),
	CONSTRAINT "group_events_latitude_range" CHECK ("group_events"."latitude" >= -90 AND "group_events"."latitude" <= 90),
	CONSTRAINT "group_events_longitude_range" CHECK ("group_events"."longitude" >= -180 AND "group_events"."longitude" <= 180),
	CONSTRAINT "group_events_max_participants_range" CHECK ("group_events"."max_participants" >= 3 AND "group_events"."max_participants" <= 50),
	CONSTRAINT "group_events_visibility_valid" CHECK ("group_events"."visibility" IN ('public', 'private')),
	CONSTRAINT "group_events_status_valid" CHECK ("group_events"."status" IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
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
	CONSTRAINT "matches_compatibility_score_range" CHECK ("matches"."compatibility_score" >= 0 AND "matches"."compatibility_score" <= 1)
);
--> statement-breakpoint
CREATE TABLE "swipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"swiper_dog_id" uuid NOT NULL,
	"swiped_dog_id" uuid NOT NULL,
	"direction" varchar(5) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "swipes_direction_valid" CHECK ("swipes"."direction" IN ('like', 'pass'))
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"hour_of_day" integer NOT NULL,
	"activity_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	CONSTRAINT "user_matching_preferences_user_id_unique" UNIQUE("user_id")
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
	CONSTRAINT "user_consents_user_type_uniq" UNIQUE("user_id","consent_type")
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
	"notification_prefs" jsonb DEFAULT '{"matches":true,"messages":true,"reminders":true}'::jsonb,
	"push_token" text,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_latitude_range" CHECK ("users"."latitude" >= -90 AND "users"."latitude" <= 90),
	CONSTRAINT "users_longitude_range" CHECK ("users"."longitude" >= -180 AND "users"."longitude" <= 180),
	CONSTRAINT "users_search_radius_range" CHECK ("users"."search_radius_km" >= 1 AND "users"."search_radius_km" <= 50),
	CONSTRAINT "users_auth_provider_valid" CHECK ("users"."auth_provider" IN ('email', 'apple', 'google'))
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"type" varchar(30) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_dog_id_dog_profiles_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dog_photos" ADD CONSTRAINT "dog_photos_dog_id_dog_profiles_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dog_profiles" ADD CONSTRAINT "dog_profiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_id_post_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "group_event_participants" ADD CONSTRAINT "group_event_participants_event_id_group_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."group_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_event_participants" ADD CONSTRAINT "group_event_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_event_participants" ADD CONSTRAINT "group_event_participants_dog_id_dog_profiles_id_fk" FOREIGN KEY ("dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_swiper_dog_id_dog_profiles_id_fk" FOREIGN KEY ("swiper_dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_score_logs" ADD CONSTRAINT "swipe_score_logs_swiped_dog_id_dog_profiles_id_fk" FOREIGN KEY ("swiped_dog_id") REFERENCES "public"."dog_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_windows" ADD CONSTRAINT "user_activity_windows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_matching_preferences" ADD CONSTRAINT "user_matching_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walks" ADD CONSTRAINT "walks_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walks" ADD CONSTRAINT "walks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_name_ts_idx" ON "analytics_events" USING btree ("event_name","server_timestamp");--> statement-breakpoint
CREATE INDEX "analytics_events_user_ts_idx" ON "analytics_events" USING btree ("user_id","server_timestamp");--> statement-breakpoint
CREATE INDEX "content_reports_reporter_idx" ON "content_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "content_reports_reviewed_by_idx" ON "content_reports" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX "post_comments_post_idx" ON "post_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_comments_author_idx" ON "post_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "post_comments_parent_idx" ON "post_comments" USING btree ("parent_id");--> statement-breakpoint
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
CREATE INDEX "group_event_participants_event_idx" ON "group_event_participants" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "group_event_participants_user_idx" ON "group_event_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_event_participants_dog_idx" ON "group_event_participants" USING btree ("dog_id");--> statement-breakpoint
CREATE INDEX "group_events_created_by_idx" ON "group_events" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "group_events_location_idx" ON "group_events" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "group_message_reads_event_idx" ON "group_message_reads" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "group_message_reads_user_idx" ON "group_message_reads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_messages_event_idx" ON "group_messages" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "group_messages_sender_idx" ON "group_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "match_interactions_match_idx" ON "match_interactions" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_interactions_user_idx" ON "match_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "swipe_score_logs_swiper_dog_idx" ON "swipe_score_logs" USING btree ("swiper_dog_id");--> statement-breakpoint
CREATE INDEX "swipe_score_logs_swiped_dog_idx" ON "swipe_score_logs" USING btree ("swiped_dog_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_activity_windows_user_day_hour_idx" ON "user_activity_windows" USING btree ("user_id","day_of_week","hour_of_day");--> statement-breakpoint
CREATE INDEX "reports_reporter_idx" ON "reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "reports_reported_user_idx" ON "reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX "users_location_idx" ON "users" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "verification_tokens_user_idx" ON "verification_tokens" USING btree ("user_id");
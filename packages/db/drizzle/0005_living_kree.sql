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
ALTER TABLE "group_event_participants" DROP CONSTRAINT "group_event_participants_status_valid";--> statement-breakpoint
ALTER TABLE "group_events" DROP CONSTRAINT "group_events_max_participants_range";--> statement-breakpoint
ALTER TABLE "group_events" DROP CONSTRAINT "group_events_visibility_valid";--> statement-breakpoint
ALTER TABLE "group_events" DROP CONSTRAINT "group_events_status_valid";--> statement-breakpoint
ALTER TABLE "user_consents" DROP CONSTRAINT "user_consents_type_valid";--> statement-breakpoint
DROP INDEX "group_events_location_idx";--> statement-breakpoint
DROP INDEX "users_location_idx";--> statement-breakpoint
ALTER TABLE "group_events" ALTER COLUMN "visibility" SET DATA TYPE varchar(15);--> statement-breakpoint
ALTER TABLE "group_events" ALTER COLUMN "visibility" SET DEFAULT 'public';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "notification_prefs" SET DEFAULT '{"matches":true,"messages":true,"reminders":true,"feed":true,"nearby":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "group_events" ADD COLUMN "recurrence_rule" varchar(255);--> statement-breakpoint
ALTER TABLE "group_events" ADD COLUMN "recurrence_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "group_events" ADD COLUMN "parent_event_id" uuid;--> statement-breakpoint
ALTER TABLE "group_events" ADD COLUMN "category" varchar(20) DEFAULT 'walk' NOT NULL;--> statement-breakpoint
ALTER TABLE "group_events" ADD COLUMN "requires_approval" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "group_events" ADD COLUMN "cover_image_url" varchar(500);--> statement-breakpoint
ALTER TABLE "group_events" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "group_events" ADD COLUMN "is_official" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deletion_scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_safety_checkins" ADD CONSTRAINT "walk_safety_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD CONSTRAINT "event_sponsors_event_id_group_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."group_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sponsors" ADD CONSTRAINT "event_sponsors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_verified_by_admin_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_admin" ON "admin_audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_audit_resource" ON "admin_audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_date" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "admin_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_emergency_contacts_user_id" ON "emergency_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_walk_safety_checkins_walk_id" ON "walk_safety_checkins" USING btree ("walk_id");--> statement-breakpoint
CREATE INDEX "idx_walk_safety_checkins_user_id" ON "walk_safety_checkins" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_sponsors_pair_idx" ON "event_sponsors" USING btree ("event_id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_pair_idx" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_parent_event_id_group_events_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "public"."group_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_messages_match_id" ON "messages" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "idx_messages_sender_id" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_dog_profiles_owner_id" ON "dog_profiles" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_stories_expires_at" ON "stories" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "group_event_participants_event_status_idx" ON "group_event_participants" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "group_events_parent_idx" ON "group_events" USING btree ("parent_event_id");--> statement-breakpoint
CREATE INDEX "group_events_category_idx" ON "group_events" USING btree ("category");--> statement-breakpoint
CREATE INDEX "group_events_organization_idx" ON "group_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_matches_dog_a_id" ON "matches" USING btree ("dog_a_id");--> statement-breakpoint
CREATE INDEX "idx_matches_dog_b_id" ON "matches" USING btree ("dog_b_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocker_id" ON "user_blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "idx_user_blocks_blocked_id" ON "user_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "idx_walks_match_id" ON "walks" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "idx_walks_created_by" ON "walks" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "group_event_participants" ADD CONSTRAINT "group_event_participants_status_valid" CHECK ("group_event_participants"."status" IN ('pending', 'accepted', 'declined', 'removed', 'cancelled'));--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_category_valid" CHECK ("group_events"."category" IN ('walk', 'meetup', 'training'));--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_max_participants_range" CHECK ("group_events"."max_participants" >= 2 AND "group_events"."max_participants" <= 500);--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_visibility_valid" CHECK ("group_events"."visibility" IN ('public', 'friends_only', 'invite_only'));--> statement-breakpoint
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_status_valid" CHECK ("group_events"."status" IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'template'));--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_type_valid" CHECK ("user_consents"."consent_type" IN ('analytics', 'ab_testing', 'error_tracking', 'marketing', 'ai_training'));
ALTER TABLE "analytics_events" DROP CONSTRAINT "analytics_events_platform_valid";--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "schema_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_platform_valid" CHECK ("analytics_events"."platform" IN ('ios', 'android', 'web', 'server'));
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
ALTER TABLE "gdpr_exports" ADD CONSTRAINT "gdpr_exports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gdpr_exports_user_idx" ON "gdpr_exports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gdpr_exports_status_idx" ON "gdpr_exports" USING btree ("status");
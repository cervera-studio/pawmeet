CREATE TABLE "waitlist_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"locale" varchar(5) DEFAULT 'it' NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed" boolean DEFAULT false NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"source" varchar(50) DEFAULT 'landing' NOT NULL,
	CONSTRAINT "waitlist_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "waitlist_email_idx" ON "waitlist_subscribers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "waitlist_subscribed_at_idx" ON "waitlist_subscribers" USING btree ("subscribed_at");
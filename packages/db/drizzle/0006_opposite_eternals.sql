ALTER TABLE "breeds" ADD COLUMN "energy" integer;--> statement-breakpoint
ALTER TABLE "breeds" ADD COLUMN "playfulness" integer;--> statement-breakpoint
ALTER TABLE "breeds" ADD COLUMN "trainability" integer;--> statement-breakpoint
ALTER TABLE "breeds" ADD COLUMN "barking" integer;--> statement-breakpoint
ALTER TABLE "breeds" ADD COLUMN "good_with_other_dogs" integer;--> statement-breakpoint
ALTER TABLE "breeds" ADD COLUMN "good_with_children" integer;--> statement-breakpoint
ALTER TABLE "breeds" ADD COLUMN "good_with_strangers" integer;--> statement-breakpoint
ALTER TABLE "breeds" ADD COLUMN "protectiveness" integer;--> statement-breakpoint
ALTER TABLE "breeds" ADD COLUMN "shedding" integer;--> statement-breakpoint
ALTER TABLE "breeds" ADD COLUMN "grooming" integer;--> statement-breakpoint
ALTER TABLE "breeds" ADD CONSTRAINT "breeds_scores_range" CHECK ("breeds"."energy" IS NULL OR ("breeds"."energy" BETWEEN 1 AND 5));
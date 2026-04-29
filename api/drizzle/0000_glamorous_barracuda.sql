CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"type" text,
	"types" jsonb DEFAULT '[]'::jsonb,
	"rating" double precision,
	"total_ratings" integer DEFAULT 0,
	"place_id" text,
	"website" text,
	"phone" text,
	"contact_name" text,
	"contact_email" text,
	"ai_score" text,
	"ai_reason" text,
	"offering" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"biz_name" text,
	"full_name" text,
	"role" text,
	"offering" text,
	"benefits" text,
	"website" text,
	"phone" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sent_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"to_email" text NOT NULL,
	"subject" text,
	"body" text,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_config" (
	"id" uuid PRIMARY KEY NOT NULL,
	"gp_key" text,
	"cl_key" text,
	"gm_email" text,
	"updated_at" timestamp DEFAULT now()
);

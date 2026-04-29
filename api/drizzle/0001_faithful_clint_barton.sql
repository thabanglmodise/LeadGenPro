CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auto_approve" boolean DEFAULT true NOT NULL,
	"global_key_mode" text DEFAULT 'disabled' NOT NULL,
	"global_gp_key" text,
	"global_cl_key" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "status" text DEFAULT 'pending_verification' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "tier" text DEFAULT 'basic' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "key_list" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "onboarding" jsonb;
ALTER TABLE "profiles" ADD COLUMN "theme" text;--> statement-breakpoint
ALTER TABLE "sent_emails" ADD COLUMN "send_method" text;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD COLUMN "smtp_host" text;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD COLUMN "smtp_port" integer;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD COLUMN "smtp_user" text;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD COLUMN "smtp_pass" text;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD COLUMN "smtp_from_name" text;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD COLUMN "smtp_from_email" text;
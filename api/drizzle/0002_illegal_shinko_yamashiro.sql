CREATE TABLE "user_api_keys" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"gp_key" text,
	"cl_key" text,
	"prefer_global" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now()
);

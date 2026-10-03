CREATE TABLE "system_heartbeats" (
	"name" text PRIMARY KEY NOT NULL,
	"beat_at" timestamp with time zone NOT NULL,
	"details" jsonb
);

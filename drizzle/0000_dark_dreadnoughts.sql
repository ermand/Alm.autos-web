CREATE TYPE "public"."body_type" AS ENUM('hatchback', 'sedan', 'suv', 'van', 'pickup', 'convertible');--> statement-breakpoint
CREATE TYPE "public"."fuel" AS ENUM('petrol', 'diesel', 'lpg', 'hybrid', 'electric');--> statement-breakpoint
CREATE TYPE "public"."transmission" AS ENUM('manual', 'automatic');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('published', 'hidden', 'retired');--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(40) NOT NULL,
	"pickup_date" varchar(10),
	"dropoff_date" varchar(10),
	"message" text,
	"locale" varchar(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"from_month" smallint NOT NULL,
	"from_day" smallint NOT NULL,
	"to_month" smallint NOT NULL,
	"to_day" smallint NOT NULL,
	"multiplier" real NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"path" varchar(255) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"model" varchar(120) NOT NULL,
	"year" smallint NOT NULL,
	"transmission" "transmission",
	"fuel" "fuel",
	"body_type" "body_type",
	"seats" smallint,
	"doors" smallint,
	"air_conditioning" boolean,
	"description_en" text,
	"description_sq" text,
	"status" "vehicle_status" DEFAULT 'published' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"base_rates" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_photos" ADD CONSTRAINT "vehicle_photos_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enquiries_created_idx" ON "enquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "vehicle_photos_vehicle_idx" ON "vehicle_photos" USING btree ("vehicle_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_slug_idx" ON "vehicles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "vehicles_status_idx" ON "vehicles" USING btree ("status");
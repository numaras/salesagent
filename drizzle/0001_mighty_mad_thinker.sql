CREATE TABLE IF NOT EXISTS "authorized_properties" (
	"property_id" varchar(100) NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"property_type" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"identifiers" jsonb NOT NULL,
	"tags" jsonb,
	"publisher_domain" varchar(255) NOT NULL,
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"verification_checked_at" timestamp,
	"verification_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "authorized_properties_property_id_tenant_id_pk" PRIMARY KEY("property_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creative_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"agent_url" varchar(500) NOT NULL,
	"name" varchar(200) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 10 NOT NULL,
	"auth_type" varchar(50),
	"auth_header" varchar(100),
	"auth_credentials" text,
	"timeout" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creative_assignments" (
	"assignment_id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"creative_id" varchar(100) NOT NULL,
	"media_buy_id" varchar(100) NOT NULL,
	"package_id" varchar(100) NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL,
	"placement_ids" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creative_reviews" (
	"review_id" varchar(100) PRIMARY KEY NOT NULL,
	"creative_id" varchar(100) NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"reviewed_at" timestamp DEFAULT now() NOT NULL,
	"review_type" varchar(20) NOT NULL,
	"reviewer_email" varchar(255),
	"ai_decision" varchar(20),
	"confidence_score" double precision,
	"policy_triggered" varchar(100),
	"reason" text,
	"recommendations" jsonb,
	"human_override" boolean DEFAULT false NOT NULL,
	"final_decision" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "currency_limits" (
	"tenant_id" varchar(50) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"min_package_budget" numeric(15, 2),
	"max_daily_package_spend" numeric(15, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "currency_limits_tenant_id_currency_code_pk" PRIMARY KEY("tenant_id","currency_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "format_performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"country_code" varchar(3),
	"creative_size" varchar(20) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"total_impressions" bigint DEFAULT 0 NOT NULL,
	"total_clicks" bigint DEFAULT 0 NOT NULL,
	"total_revenue_micros" bigint DEFAULT 0 NOT NULL,
	"average_cpm" numeric(10, 2),
	"median_cpm" numeric(10, 2),
	"p75_cpm" numeric(10, 2),
	"p90_cpm" numeric(10, 2),
	"line_item_count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gam_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"inventory_type" varchar(30) NOT NULL,
	"inventory_id" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"path" jsonb,
	"status" varchar(20) NOT NULL,
	"inventory_metadata" jsonb,
	"last_synced" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gam_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"line_item_id" varchar(50) NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"status" varchar(20) NOT NULL,
	"line_item_type" varchar(30) NOT NULL,
	"priority" integer,
	"start_date" timestamp,
	"end_date" timestamp,
	"cost_type" varchar(20),
	"cost_per_unit" double precision,
	"stats_impressions" bigint,
	"stats_clicks" bigint,
	"targeting" jsonb,
	"line_item_metadata" jsonb,
	"last_synced" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gam_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"advertiser_id" varchar(50),
	"advertiser_name" varchar(255),
	"status" varchar(20) NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"total_budget" double precision,
	"currency_code" varchar(10),
	"po_number" varchar(100),
	"notes" text,
	"order_metadata" jsonb,
	"last_synced" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"profile_id" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"inventory_config" jsonb NOT NULL,
	"format_ids" jsonb NOT NULL,
	"publisher_properties" jsonb NOT NULL,
	"targeting_template" jsonb,
	"gam_preset_id" varchar(100),
	"gam_preset_sync_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_inventory_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"product_id" varchar(50) NOT NULL,
	"inventory_type" varchar(30) NOT NULL,
	"inventory_id" varchar(50) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_tags" (
	"tag_id" varchar(50) NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "property_tags_tag_id_tenant_id_pk" PRIMARY KEY("tag_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "publisher_partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"publisher_domain" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"is_verified" boolean DEFAULT false NOT NULL,
	"last_synced_at" timestamp,
	"sync_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_notification_configs" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"principal_id" varchar(50) NOT NULL,
	"session_id" varchar(100),
	"url" text NOT NULL,
	"authentication_type" varchar(50),
	"authentication_token" text,
	"validation_token" text,
	"webhook_secret" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signals_agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"agent_url" varchar(500) NOT NULL,
	"name" varchar(200) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"auth_type" varchar(50),
	"auth_header" varchar(100),
	"auth_credentials" text,
	"forward_promoted_offering" boolean DEFAULT true NOT NULL,
	"timeout" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategies" (
	"strategy_id" varchar(255) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50),
	"principal_id" varchar(100),
	"name" varchar(255) NOT NULL,
	"description" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_simulation" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategy_states" (
	"strategy_id" varchar(255) NOT NULL,
	"state_key" varchar(255) NOT NULL,
	"state_value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "strategy_states_strategy_id_state_key_pk" PRIMARY KEY("strategy_id","state_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "superadmin_config" (
	"config_key" varchar(100) PRIMARY KEY NOT NULL,
	"config_value" text,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_jobs" (
	"sync_id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"adapter_type" varchar(50) NOT NULL,
	"sync_type" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"summary" text,
	"error_message" text,
	"triggered_by" varchar(50) NOT NULL,
	"triggered_by_id" varchar(255),
	"progress" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_auth_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"oidc_enabled" boolean DEFAULT false NOT NULL,
	"oidc_provider" varchar(50),
	"oidc_discovery_url" varchar(500),
	"oidc_client_id" varchar(500),
	"oidc_client_secret_encrypted" text,
	"oidc_scopes" varchar(500) DEFAULT 'openid email profile',
	"oidc_logout_url" varchar(500),
	"oidc_verified_at" timestamp with time zone,
	"oidc_verified_redirect_uri" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "tenant_auth_configs_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"user_id" varchar(50) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(200) NOT NULL,
	"role" varchar(20) NOT NULL,
	"google_id" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"last_login" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
	"delivery_id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"webhook_url" varchar(500) NOT NULL,
	"payload" jsonb NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"object_id" varchar(100),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"delivered_at" timestamp,
	"last_error" text,
	"response_code" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_delivery_log" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"principal_id" text NOT NULL,
	"media_buy_id" text NOT NULL,
	"webhook_url" text NOT NULL,
	"task_type" text NOT NULL,
	"sequence_number" integer DEFAULT 1 NOT NULL,
	"notification_type" text,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"status" text NOT NULL,
	"http_status_code" integer,
	"error_message" text,
	"payload_size_bytes" integer,
	"response_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"next_retry_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "authorized_properties" ADD CONSTRAINT "authorized_properties_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creative_agents" ADD CONSTRAINT "creative_agents_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creative_assignments" ADD CONSTRAINT "creative_assignments_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creative_reviews" ADD CONSTRAINT "creative_reviews_creative_id_creatives_creative_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."creatives"("creative_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creative_reviews" ADD CONSTRAINT "creative_reviews_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "currency_limits" ADD CONSTRAINT "currency_limits_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "format_performance_metrics" ADD CONSTRAINT "format_performance_metrics_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gam_inventory" ADD CONSTRAINT "gam_inventory_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gam_line_items" ADD CONSTRAINT "gam_line_items_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gam_orders" ADD CONSTRAINT "gam_orders_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_profiles" ADD CONSTRAINT "inventory_profiles_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "property_tags" ADD CONSTRAINT "property_tags_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "publisher_partners" ADD CONSTRAINT "publisher_partners_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "push_notification_configs" ADD CONSTRAINT "push_notification_configs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signals_agents" ADD CONSTRAINT "signals_agents_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strategies" ADD CONSTRAINT "strategies_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strategy_states" ADD CONSTRAINT "strategy_states_strategy_id_strategies_strategy_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("strategy_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_auth_configs" ADD CONSTRAINT "tenant_auth_configs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_delivery_log" ADD CONSTRAINT "webhook_delivery_log_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_authorized_properties_tenant" ON "authorized_properties" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_authorized_properties_domain" ON "authorized_properties" USING btree ("publisher_domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_authorized_properties_verification" ON "authorized_properties" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creative_agents_tenant" ON "creative_agents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creative_agents_enabled" ON "creative_agents" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creative_assignments_tenant" ON "creative_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creative_assignments_creative" ON "creative_assignments" USING btree ("creative_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creative_assignments_media_buy" ON "creative_assignments" USING btree ("media_buy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_creative_reviews_creative_id" ON "creative_reviews" USING btree ("creative_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_creative_reviews_tenant_id" ON "creative_reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_creative_reviews_review_type" ON "creative_reviews" USING btree ("review_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_creative_reviews_final_decision" ON "creative_reviews" USING btree ("final_decision");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_currency_limits_tenant" ON "currency_limits" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_format_perf_tenant" ON "format_performance_metrics" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_format_perf_country_size" ON "format_performance_metrics" USING btree ("country_code","creative_size");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_format_perf_period" ON "format_performance_metrics" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gam_inventory_tenant" ON "gam_inventory" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gam_inventory_type" ON "gam_inventory" USING btree ("inventory_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gam_inventory_status" ON "gam_inventory" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gam_line_items_tenant" ON "gam_line_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gam_line_items_line_item_id" ON "gam_line_items" USING btree ("line_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gam_line_items_order_id" ON "gam_line_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gam_line_items_status" ON "gam_line_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gam_orders_tenant" ON "gam_orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gam_orders_order_id" ON "gam_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gam_orders_status" ON "gam_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_profiles_tenant" ON "inventory_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_product_inventory_mapping" ON "product_inventory_mappings" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_property_tags_tenant" ON "property_tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_publisher_partners_tenant" ON "publisher_partners" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_publisher_partners_domain" ON "publisher_partners" USING btree ("publisher_domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_publisher_partners_verified" ON "publisher_partners" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_push_notification_configs_tenant" ON "push_notification_configs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_push_notification_configs_principal" ON "push_notification_configs" USING btree ("tenant_id","principal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_signals_agents_tenant" ON "signals_agents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_signals_agents_enabled" ON "signals_agents" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_strategies_tenant" ON "strategies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_strategies_simulation" ON "strategies" USING btree ("is_simulation");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_strategy_states_id" ON "strategy_states" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_jobs_tenant" ON "sync_jobs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_jobs_status" ON "sync_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_jobs_started" ON "sync_jobs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tenant_auth_configs_tenant_id" ON "tenant_auth_configs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_tenant" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_tenant" ON "webhook_deliveries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_status" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_event_type" ON "webhook_deliveries" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_created" ON "webhook_deliveries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_log_media_buy" ON "webhook_delivery_log" USING btree ("media_buy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_log_tenant" ON "webhook_delivery_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_log_status" ON "webhook_delivery_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_log_created_at" ON "webhook_delivery_log" USING btree ("created_at");
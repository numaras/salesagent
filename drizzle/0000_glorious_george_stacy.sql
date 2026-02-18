CREATE TABLE IF NOT EXISTS "adapter_config" (
	"tenant_id" varchar(50) PRIMARY KEY NOT NULL,
	"adapter_type" varchar(50) NOT NULL,
	"mock_dry_run" boolean,
	"mock_manual_approval_required" boolean DEFAULT false,
	"gam_network_code" varchar(50),
	"gam_refresh_token" text,
	"gam_service_account_json" text,
	"gam_trafficker_id" varchar(50),
	"gam_manual_approval_required" boolean DEFAULT false,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"log_id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"operation" varchar(100) NOT NULL,
	"principal_name" varchar(255),
	"principal_id" varchar(50),
	"success" boolean NOT NULL,
	"error_message" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contexts" (
	"context_id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"principal_id" varchar(50) NOT NULL,
	"conversation_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creatives" (
	"creative_id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"principal_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"agent_url" varchar(500) NOT NULL,
	"format" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_buys" (
	"media_buy_id" varchar(100) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"principal_id" varchar(50) NOT NULL,
	"buyer_ref" varchar(100),
	"order_name" varchar(255) NOT NULL,
	"advertiser_name" varchar(255) NOT NULL,
	"budget" numeric(15, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"raw_request" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_packages" (
	"media_buy_id" varchar(100) NOT NULL,
	"package_id" varchar(100) NOT NULL,
	"budget" numeric(15, 2),
	"package_config" jsonb NOT NULL,
	CONSTRAINT "media_packages_media_buy_id_package_id_pk" PRIMARY KEY("media_buy_id","package_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "object_workflow_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_type" varchar(50) NOT NULL,
	"object_id" varchar(100) NOT NULL,
	"step_id" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(50) NOT NULL,
	"product_id" varchar(100) NOT NULL,
	"pricing_model" varchar(20) NOT NULL,
	"rate" numeric(10, 2),
	"currency" varchar(3) NOT NULL,
	"is_fixed" boolean NOT NULL,
	"price_guidance" jsonb,
	"parameters" jsonb,
	"min_spend_per_package" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "principals" (
	"tenant_id" varchar(50) NOT NULL,
	"principal_id" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"platform_mappings" jsonb NOT NULL,
	"access_token" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "principals_tenant_id_principal_id_pk" PRIMARY KEY("tenant_id","principal_id"),
	CONSTRAINT "principals_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"tenant_id" varchar(50) NOT NULL,
	"product_id" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"format_ids" jsonb NOT NULL,
	"targeting_template" jsonb NOT NULL,
	"delivery_type" varchar(50) NOT NULL,
	"measurement" jsonb,
	"is_custom" boolean DEFAULT false,
	"implementation_config" jsonb,
	"property_tags" jsonb,
	CONSTRAINT "products_tenant_id_product_id_pk" PRIMARY KEY("tenant_id","product_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"tenant_id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"subdomain" varchar(100) NOT NULL,
	"virtual_host" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true,
	"ad_server" varchar(50),
	"admin_token" varchar(100),
	"brand_manifest_policy" varchar(50) DEFAULT 'require_auth',
	"auth_setup_mode" boolean DEFAULT true,
	CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_steps" (
	"step_id" varchar(100) PRIMARY KEY NOT NULL,
	"context_id" varchar(100) NOT NULL,
	"step_type" varchar(50) NOT NULL,
	"tool_name" varchar(100),
	"request_data" jsonb,
	"response_data" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"owner" varchar(20) NOT NULL,
	"assigned_to" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adapter_config" ADD CONSTRAINT "adapter_config_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contexts" ADD CONSTRAINT "contexts_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creatives" ADD CONSTRAINT "creatives_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_buys" ADD CONSTRAINT "media_buys_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_packages" ADD CONSTRAINT "media_packages_media_buy_id_media_buys_media_buy_id_fk" FOREIGN KEY ("media_buy_id") REFERENCES "public"."media_buys"("media_buy_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "object_workflow_mapping" ADD CONSTRAINT "object_workflow_mapping_step_id_workflow_steps_step_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("step_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "principals" ADD CONSTRAINT "principals_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_context_id_contexts_context_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."contexts"("context_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_adapter_config_type" ON "adapter_config" USING btree ("adapter_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contexts_tenant" ON "contexts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contexts_principal" ON "contexts" USING btree ("principal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creatives_tenant" ON "creatives" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creatives_principal" ON "creatives" USING btree ("tenant_id","principal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_media_buys_tenant" ON "media_buys" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_media_buys_status" ON "media_buys" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_media_packages_media_buy" ON "media_packages" USING btree ("media_buy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_object_workflow_type_id" ON "object_workflow_mapping" USING btree ("object_type","object_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_object_workflow_step" ON "object_workflow_mapping" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pricing_options_product" ON "pricing_options" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_principals_tenant" ON "principals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_principals_token" ON "principals" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_tenant" ON "products" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subdomain" ON "tenants" USING btree ("subdomain");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_tenants_virtual_host" ON "tenants" USING btree ("virtual_host");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workflow_steps_context" ON "workflow_steps" USING btree ("context_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workflow_steps_status" ON "workflow_steps" USING btree ("status");
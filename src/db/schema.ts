/**
 * Drizzle schema matching existing PostgreSQL tables (python_src migrations).
 * Used for read/write via repositories; no schema generation (DB already exists).
 */

import {
  boolean,
  date,
  decimal,
  index,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const tenants = pgTable(
  "tenants",
  {
    tenantId: varchar("tenant_id", { length: 50 }).primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
    virtualHost: text("virtual_host"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    isActive: boolean("is_active").default(true),
    adServer: varchar("ad_server", { length: 50 }),
    adminToken: varchar("admin_token", { length: 100 }),
    brandManifestPolicy: varchar("brand_manifest_policy", { length: 50 }).default("require_auth"),
    authSetupMode: boolean("auth_setup_mode").default(true),
  },
  (t) => ({
    subdomainIdx: index("idx_subdomain").on(t.subdomain),
    virtualHostIdx: uniqueIndex("ix_tenants_virtual_host").on(t.virtualHost),
  })
);

export const principals = pgTable(
  "principals",
  {
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    principalId: varchar("principal_id", { length: 50 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    platformMappings: jsonb("platform_mappings").notNull(),
    accessToken: varchar("access_token", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.principalId] }),
    index("idx_principals_tenant").on(t.tenantId),
    index("idx_principals_token").on(t.accessToken),
  ]
);

export const products = pgTable(
  "products",
  {
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    formatIds: jsonb("format_ids").notNull(),
    targetingTemplate: jsonb("targeting_template").notNull(),
    deliveryType: varchar("delivery_type", { length: 50 }).notNull(),
    measurement: jsonb("measurement"),
    isCustom: boolean("is_custom").default(false),
    implementationConfig: jsonb("implementation_config"),
    propertyTags: jsonb("property_tags"),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.productId] }),
    index("idx_products_tenant").on(t.tenantId),
  ]
);

export const pricingOptions = pgTable(
  "pricing_options",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull(),
    productId: varchar("product_id", { length: 100 }).notNull(),
    pricingModel: varchar("pricing_model", { length: 20 }).notNull(),
    rate: decimal("rate", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull(),
    isFixed: boolean("is_fixed").notNull(),
    priceGuidance: jsonb("price_guidance"),
    parameters: jsonb("parameters"),
    minSpendPerPackage: decimal("min_spend_per_package", { precision: 10, scale: 2 }),
  },
  (t) => [index("idx_pricing_options_product").on(t.tenantId, t.productId)]
);

export const adapterConfig = pgTable(
  "adapter_config",
  {
    tenantId: varchar("tenant_id", { length: 50 }).primaryKey().references(() => tenants.tenantId, { onDelete: "cascade" }),
    adapterType: varchar("adapter_type", { length: 50 }).notNull(),
    mockDryRun: boolean("mock_dry_run"),
    mockManualApprovalRequired: boolean("mock_manual_approval_required").default(false),
    gamNetworkCode: varchar("gam_network_code", { length: 50 }),
    gamRefreshToken: text("gam_refresh_token"),
    gamServiceAccountJson: text("gam_service_account_json"),
    gamTraffickerId: varchar("gam_trafficker_id", { length: 50 }),
    gamManualApprovalRequired: boolean("gam_manual_approval_required").default(false),
    configJson: jsonb("config_json").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("idx_adapter_config_type").on(t.adapterType)]
);

export const mediaBuys = pgTable(
  "media_buys",
  {
    mediaBuyId: varchar("media_buy_id", { length: 100 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    principalId: varchar("principal_id", { length: 50 }).notNull(),
    buyerRef: varchar("buyer_ref", { length: 100 }),
    orderName: varchar("order_name", { length: 255 }).notNull(),
    advertiserName: varchar("advertiser_name", { length: 255 }).notNull(),
    budget: decimal("budget", { precision: 15, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    rawRequest: jsonb("raw_request").notNull(),
  },
  (t) => [
    index("idx_media_buys_tenant").on(t.tenantId),
    index("idx_media_buys_status").on(t.status),
  ]
);

export const mediaPackages = pgTable(
  "media_packages",
  {
    mediaBuyId: varchar("media_buy_id", { length: 100 }).notNull().references(() => mediaBuys.mediaBuyId),
    packageId: varchar("package_id", { length: 100 }).notNull(),
    budget: decimal("budget", { precision: 15, scale: 2 }),
    packageConfig: jsonb("package_config").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.mediaBuyId, t.packageId] }),
    index("idx_media_packages_media_buy").on(t.mediaBuyId),
  ]
);

export const creatives = pgTable(
  "creatives",
  {
    creativeId: varchar("creative_id", { length: 100 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    principalId: varchar("principal_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    agentUrl: varchar("agent_url", { length: 500 }).notNull(),
    format: varchar("format", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [
    index("idx_creatives_tenant").on(t.tenantId),
    index("idx_creatives_principal").on(t.tenantId, t.principalId),
  ]
);

export const contexts = pgTable(
  "contexts",
  {
    contextId: varchar("context_id", { length: 100 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    principalId: varchar("principal_id", { length: 50 }).notNull(),
    conversationHistory: jsonb("conversation_history").notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_contexts_tenant").on(t.tenantId),
    index("idx_contexts_principal").on(t.principalId),
  ]
);

export const workflowSteps = pgTable(
  "workflow_steps",
  {
    stepId: varchar("step_id", { length: 100 }).primaryKey(),
    contextId: varchar("context_id", { length: 100 }).notNull().references(() => contexts.contextId, { onDelete: "cascade" }),
    stepType: varchar("step_type", { length: 50 }).notNull(),
    toolName: varchar("tool_name", { length: 100 }),
    requestData: jsonb("request_data"),
    responseData: jsonb("response_data"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    owner: varchar("owner", { length: 20 }).notNull(),
    assignedTo: varchar("assigned_to", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    errorMessage: text("error_message"),
  },
  (t) => [
    index("idx_workflow_steps_context").on(t.contextId),
    index("idx_workflow_steps_status").on(t.status),
  ]
);

export const objectWorkflowMapping = pgTable(
  "object_workflow_mapping",
  {
    id: serial("id").primaryKey(),
    objectType: varchar("object_type", { length: 50 }).notNull(),
    objectId: varchar("object_id", { length: 100 }).notNull(),
    stepId: varchar("step_id", { length: 100 }).notNull().references(() => workflowSteps.stepId, { onDelete: "cascade" }),
    action: varchar("action", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_object_workflow_type_id").on(t.objectType, t.objectId),
    index("idx_object_workflow_step").on(t.stepId),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    logId: serial("log_id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp").defaultNow(),
    operation: varchar("operation", { length: 100 }).notNull(),
    principalName: varchar("principal_name", { length: 255 }),
    principalId: varchar("principal_id", { length: 50 }),
    success: boolean("success").notNull(),
    errorMessage: text("error_message"),
    details: jsonb("details"),
  },
  (t) => [index("idx_audit_logs_tenant").on(t.tenantId)]
);

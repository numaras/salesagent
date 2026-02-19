/**
 * Drizzle schema matching existing PostgreSQL tables (python_src migrations).
 * Used for read/write via repositories; no schema generation (DB already exists).
 */

import {
  bigint,
  boolean,
  date,
  decimal,
  doublePrecision,
  index,
  integer,
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

// --- Tables added in Phase 1 (feature parity) ---

export const currencyLimits = pgTable(
  "currency_limits",
  {
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    minPackageBudget: decimal("min_package_budget", { precision: 15, scale: 2 }),
    maxDailyPackageSpend: decimal("max_daily_package_spend", { precision: 15, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.currencyCode] }),
    index("idx_currency_limits_tenant").on(t.tenantId),
  ]
);

export const users = pgTable(
  "users",
  {
    userId: varchar("user_id", { length: 50 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    googleId: varchar("google_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    lastLogin: timestamp("last_login"),
    isActive: boolean("is_active").default(true),
  },
  (t) => [
    index("idx_users_tenant").on(t.tenantId),
    index("idx_users_email").on(t.email),
  ]
);

export const tenantAuthConfigs = pgTable(
  "tenant_auth_configs",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }).unique(),
    oidcEnabled: boolean("oidc_enabled").default(false).notNull(),
    oidcProvider: varchar("oidc_provider", { length: 50 }),
    oidcDiscoveryUrl: varchar("oidc_discovery_url", { length: 500 }),
    oidcClientId: varchar("oidc_client_id", { length: 500 }),
    oidcClientSecretEncrypted: text("oidc_client_secret_encrypted"),
    oidcScopes: varchar("oidc_scopes", { length: 500 }).default("openid email profile"),
    oidcLogoutUrl: varchar("oidc_logout_url", { length: 500 }),
    oidcVerifiedAt: timestamp("oidc_verified_at", { withTimezone: true }),
    oidcVerifiedRedirectUri: varchar("oidc_verified_redirect_uri", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [index("idx_tenant_auth_configs_tenant_id").on(t.tenantId)]
);

export const creativeReviews = pgTable(
  "creative_reviews",
  {
    reviewId: varchar("review_id", { length: 100 }).primaryKey(),
    creativeId: varchar("creative_id", { length: 100 }).notNull().references(() => creatives.creativeId, { onDelete: "cascade" }),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
    reviewType: varchar("review_type", { length: 20 }).notNull(),
    reviewerEmail: varchar("reviewer_email", { length: 255 }),
    aiDecision: varchar("ai_decision", { length: 20 }),
    confidenceScore: doublePrecision("confidence_score"),
    policyTriggered: varchar("policy_triggered", { length: 100 }),
    reason: text("reason"),
    recommendations: jsonb("recommendations"),
    humanOverride: boolean("human_override").default(false).notNull(),
    finalDecision: varchar("final_decision", { length: 20 }).notNull(),
  },
  (t) => [
    index("ix_creative_reviews_creative_id").on(t.creativeId),
    index("ix_creative_reviews_tenant_id").on(t.tenantId),
    index("ix_creative_reviews_review_type").on(t.reviewType),
    index("ix_creative_reviews_final_decision").on(t.finalDecision),
  ]
);

export const creativeAssignments = pgTable(
  "creative_assignments",
  {
    assignmentId: varchar("assignment_id", { length: 100 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    creativeId: varchar("creative_id", { length: 100 }).notNull(),
    mediaBuyId: varchar("media_buy_id", { length: 100 }).notNull(),
    packageId: varchar("package_id", { length: 100 }).notNull(),
    weight: integer("weight").default(100).notNull(),
    placementIds: jsonb("placement_ids"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_creative_assignments_tenant").on(t.tenantId),
    index("idx_creative_assignments_creative").on(t.creativeId),
    index("idx_creative_assignments_media_buy").on(t.mediaBuyId),
  ]
);

export const creativeAgents = pgTable(
  "creative_agents",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    agentUrl: varchar("agent_url", { length: 500 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    priority: integer("priority").default(10).notNull(),
    authType: varchar("auth_type", { length: 50 }),
    authHeader: varchar("auth_header", { length: 100 }),
    authCredentials: text("auth_credentials"),
    timeout: integer("timeout").default(30).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_creative_agents_tenant").on(t.tenantId),
    index("idx_creative_agents_enabled").on(t.enabled),
  ]
);

export const signalsAgents = pgTable(
  "signals_agents",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    agentUrl: varchar("agent_url", { length: 500 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    authType: varchar("auth_type", { length: 50 }),
    authHeader: varchar("auth_header", { length: 100 }),
    authCredentials: text("auth_credentials"),
    forwardPromotedOffering: boolean("forward_promoted_offering").default(true).notNull(),
    timeout: integer("timeout").default(30).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_signals_agents_tenant").on(t.tenantId),
    index("idx_signals_agents_enabled").on(t.enabled),
  ]
);

export const gamInventory = pgTable(
  "gam_inventory",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    inventoryType: varchar("inventory_type", { length: 30 }).notNull(),
    inventoryId: varchar("inventory_id", { length: 50 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    path: jsonb("path"),
    status: varchar("status", { length: 20 }).notNull(),
    inventoryMetadata: jsonb("inventory_metadata"),
    lastSynced: timestamp("last_synced").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_gam_inventory_tenant").on(t.tenantId),
    index("idx_gam_inventory_type").on(t.inventoryType),
    index("idx_gam_inventory_status").on(t.status),
  ]
);

export const inventoryProfiles = pgTable(
  "inventory_profiles",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    profileId: varchar("profile_id", { length: 100 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    inventoryConfig: jsonb("inventory_config").notNull(),
    formatIds: jsonb("format_ids").notNull(),
    publisherProperties: jsonb("publisher_properties").notNull(),
    targetingTemplate: jsonb("targeting_template"),
    gamPresetId: varchar("gam_preset_id", { length: 100 }),
    gamPresetSyncEnabled: boolean("gam_preset_sync_enabled").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_inventory_profiles_tenant").on(t.tenantId)]
);

export const productInventoryMappings = pgTable(
  "product_inventory_mappings",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull(),
    productId: varchar("product_id", { length: 50 }).notNull(),
    inventoryType: varchar("inventory_type", { length: 30 }).notNull(),
    inventoryId: varchar("inventory_id", { length: 50 }).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_product_inventory_mapping").on(t.tenantId, t.productId)]
);

export const formatPerformanceMetrics = pgTable(
  "format_performance_metrics",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    countryCode: varchar("country_code", { length: 3 }),
    creativeSize: varchar("creative_size", { length: 20 }).notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    totalImpressions: bigint("total_impressions", { mode: "number" }).default(0).notNull(),
    totalClicks: bigint("total_clicks", { mode: "number" }).default(0).notNull(),
    totalRevenueMicros: bigint("total_revenue_micros", { mode: "number" }).default(0).notNull(),
    averageCpm: decimal("average_cpm", { precision: 10, scale: 2 }),
    medianCpm: decimal("median_cpm", { precision: 10, scale: 2 }),
    p75Cpm: decimal("p75_cpm", { precision: 10, scale: 2 }),
    p90Cpm: decimal("p90_cpm", { precision: 10, scale: 2 }),
    lineItemCount: integer("line_item_count").default(0).notNull(),
    lastUpdated: timestamp("last_updated").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_format_perf_tenant").on(t.tenantId),
    index("idx_format_perf_country_size").on(t.countryCode, t.creativeSize),
    index("idx_format_perf_period").on(t.periodStart, t.periodEnd),
  ]
);

export const gamOrders = pgTable(
  "gam_orders",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    orderId: varchar("order_id", { length: 50 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    advertiserId: varchar("advertiser_id", { length: 50 }),
    advertiserName: varchar("advertiser_name", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull(),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    totalBudget: doublePrecision("total_budget"),
    currencyCode: varchar("currency_code", { length: 10 }),
    poNumber: varchar("po_number", { length: 100 }),
    notes: text("notes"),
    orderMetadata: jsonb("order_metadata"),
    lastSynced: timestamp("last_synced").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_gam_orders_tenant").on(t.tenantId),
    index("idx_gam_orders_order_id").on(t.orderId),
    index("idx_gam_orders_status").on(t.status),
  ]
);

export const gamLineItems = pgTable(
  "gam_line_items",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    lineItemId: varchar("line_item_id", { length: 50 }).notNull(),
    orderId: varchar("order_id", { length: 50 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    lineItemType: varchar("line_item_type", { length: 30 }).notNull(),
    priority: integer("priority"),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    costType: varchar("cost_type", { length: 20 }),
    costPerUnit: doublePrecision("cost_per_unit"),
    statsImpressions: bigint("stats_impressions", { mode: "number" }),
    statsClicks: bigint("stats_clicks", { mode: "number" }),
    targeting: jsonb("targeting"),
    lineItemMetadata: jsonb("line_item_metadata"),
    lastSynced: timestamp("last_synced").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_gam_line_items_tenant").on(t.tenantId),
    index("idx_gam_line_items_line_item_id").on(t.lineItemId),
    index("idx_gam_line_items_order_id").on(t.orderId),
    index("idx_gam_line_items_status").on(t.status),
  ]
);

export const syncJobs = pgTable(
  "sync_jobs",
  {
    syncId: varchar("sync_id", { length: 100 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    adapterType: varchar("adapter_type", { length: 50 }).notNull(),
    syncType: varchar("sync_type", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    startedAt: timestamp("started_at").notNull(),
    completedAt: timestamp("completed_at"),
    summary: text("summary"),
    errorMessage: text("error_message"),
    triggeredBy: varchar("triggered_by", { length: 50 }).notNull(),
    triggeredById: varchar("triggered_by_id", { length: 255 }),
    progress: jsonb("progress"),
  },
  (t) => [
    index("idx_sync_jobs_tenant").on(t.tenantId),
    index("idx_sync_jobs_status").on(t.status),
    index("idx_sync_jobs_started").on(t.startedAt),
  ]
);

export const strategies = pgTable(
  "strategies",
  {
    strategyId: varchar("strategy_id", { length: 255 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).references(() => tenants.tenantId, { onDelete: "cascade" }),
    principalId: varchar("principal_id", { length: 100 }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    config: jsonb("config").default({}).notNull(),
    isSimulation: boolean("is_simulation").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_strategies_tenant").on(t.tenantId),
    index("idx_strategies_simulation").on(t.isSimulation),
  ]
);

export const strategyStates = pgTable(
  "strategy_states",
  {
    strategyId: varchar("strategy_id", { length: 255 }).notNull().references(() => strategies.strategyId, { onDelete: "cascade" }),
    stateKey: varchar("state_key", { length: 255 }).notNull(),
    stateValue: jsonb("state_value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.strategyId, t.stateKey] }),
    index("idx_strategy_states_id").on(t.strategyId),
  ]
);

export const authorizedProperties = pgTable(
  "authorized_properties",
  {
    propertyId: varchar("property_id", { length: 100 }).notNull(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    propertyType: varchar("property_type", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    identifiers: jsonb("identifiers").notNull(),
    tags: jsonb("tags"),
    publisherDomain: varchar("publisher_domain", { length: 255 }).notNull(),
    verificationStatus: varchar("verification_status", { length: 20 }).default("pending").notNull(),
    verificationCheckedAt: timestamp("verification_checked_at"),
    verificationError: text("verification_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.propertyId, t.tenantId] }),
    index("idx_authorized_properties_tenant").on(t.tenantId),
    index("idx_authorized_properties_domain").on(t.publisherDomain),
    index("idx_authorized_properties_verification").on(t.verificationStatus),
  ]
);

export const propertyTags = pgTable(
  "property_tags",
  {
    tagId: varchar("tag_id", { length: 50 }).notNull(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tagId, t.tenantId] }),
    index("idx_property_tags_tenant").on(t.tenantId),
  ]
);

export const publisherPartners = pgTable(
  "publisher_partners",
  {
    id: serial("id").primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    publisherDomain: varchar("publisher_domain", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }),
    isVerified: boolean("is_verified").default(false).notNull(),
    lastSyncedAt: timestamp("last_synced_at"),
    syncStatus: varchar("sync_status", { length: 20 }).default("pending").notNull(),
    syncError: text("sync_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_publisher_partners_tenant").on(t.tenantId),
    index("idx_publisher_partners_domain").on(t.publisherDomain),
    index("idx_publisher_partners_verified").on(t.isVerified),
  ]
);

export const pushNotificationConfigs = pgTable(
  "push_notification_configs",
  {
    id: varchar("id", { length: 50 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    principalId: varchar("principal_id", { length: 50 }).notNull(),
    sessionId: varchar("session_id", { length: 100 }),
    url: text("url").notNull(),
    authenticationType: varchar("authentication_type", { length: 50 }),
    authenticationToken: text("authentication_token"),
    validationToken: text("validation_token"),
    webhookSecret: varchar("webhook_secret", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => [
    index("idx_push_notification_configs_tenant").on(t.tenantId),
    index("idx_push_notification_configs_principal").on(t.tenantId, t.principalId),
  ]
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    deliveryId: varchar("delivery_id", { length: 100 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 50 }).notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    webhookUrl: varchar("webhook_url", { length: 500 }).notNull(),
    payload: jsonb("payload").notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    objectId: varchar("object_id", { length: 100 }),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastAttemptAt: timestamp("last_attempt_at"),
    deliveredAt: timestamp("delivered_at"),
    lastError: text("last_error"),
    responseCode: integer("response_code"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_webhook_deliveries_tenant").on(t.tenantId),
    index("idx_webhook_deliveries_status").on(t.status),
    index("idx_webhook_deliveries_event_type").on(t.eventType),
    index("idx_webhook_deliveries_created").on(t.createdAt),
  ]
);

export const webhookDeliveryLog = pgTable(
  "webhook_delivery_log",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().references(() => tenants.tenantId, { onDelete: "cascade" }),
    principalId: text("principal_id").notNull(),
    mediaBuyId: text("media_buy_id").notNull(),
    webhookUrl: text("webhook_url").notNull(),
    taskType: text("task_type").notNull(),
    sequenceNumber: integer("sequence_number").default(1).notNull(),
    notificationType: text("notification_type"),
    attemptCount: integer("attempt_count").default(1).notNull(),
    status: text("status").notNull(),
    httpStatusCode: integer("http_status_code"),
    errorMessage: text("error_message"),
    payloadSizeBytes: integer("payload_size_bytes"),
    responseTimeMs: integer("response_time_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_webhook_log_media_buy").on(t.mediaBuyId),
    index("idx_webhook_log_tenant").on(t.tenantId),
    index("idx_webhook_log_status").on(t.status),
    index("idx_webhook_log_created_at").on(t.createdAt),
  ]
);

export const superadminConfig = pgTable("superadmin_config", {
  configKey: varchar("config_key", { length: 100 }).primaryKey(),
  configValue: text("config_value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by", { length: 255 }),
});

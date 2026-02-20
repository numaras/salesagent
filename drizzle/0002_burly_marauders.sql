ALTER TABLE "tenants" ADD COLUMN "authorized_emails" jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "authorized_domains" jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "slack_webhook_url" varchar(500);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "slack_audit_webhook_url" varchar(500);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "ai_config" jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "policies" jsonb;
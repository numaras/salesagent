import { type Request, type Response, Router } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { resolveFromHeaders, toToolContext } from "../../core/auth/authService.js";
import { NotFoundError, TenantError, toHttpError } from "../../core/errors.js";
import { headersFromNodeRequest } from "../../core/httpHeaders.js";
import { getDb } from "../../db/client.js";
import {
  listCreativesByTenant,
  getCreativeById,
} from "../../db/repositories/creative.js";
import { creatives, creativeReviews } from "../../db/schema.js";
import { getAiConfig } from "../../services/ai/config.js";
import { reviewCreative } from "../../services/ai/agents/reviewAgent.js";

function paramStr(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : v?.[0];
}

export function createCreativesRouter(): Router {
  const router = Router();

  router.get("/creatives", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();

      const rows = await listCreativesByTenant(db, ctx.tenantId);
      
      const creativeIds = rows.map(r => r.creativeId);
      const reviews = creativeIds.length > 0 
        ? await db.select().from(creativeReviews).where(inArray(creativeReviews.creativeId, creativeIds)).orderBy(desc(creativeReviews.reviewedAt))
        : [];

      // Map reviews by creativeId (taking the latest one because of orderBy desc)
      const latestReviews = new Map();
      for (const review of reviews) {
        if (!latestReviews.has(review.creativeId)) {
          latestReviews.set(review.creativeId, review);
        }
      }

      res.json({
        creatives: rows.map((r) => {
          const rev = latestReviews.get(r.creativeId);
          return {
            creative_id: r.creativeId,
            name: r.name,
            format: r.format,
            status: r.status,
            agent_url: r.agentUrl,
            principal_id: r.principalId,
            created_at: r.createdAt,
            confidence_score: rev?.confidenceScore,
            policy_triggered: rev?.policyTriggered,
            ai_decision: rev?.aiDecision,
            human_override: rev?.humanOverride,
          };
        }),
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.get("/creatives/:creativeId", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const creativeId = paramStr(req.params.creativeId);
      if (!creativeId) throw new NotFoundError("Creative", "undefined");

      const row = await getCreativeById(db, creativeId);
      if (!row || row.tenantId !== ctx.tenantId) {
        throw new NotFoundError("Creative", creativeId);
      }

      const reviews = await db.select().from(creativeReviews)
        .where(eq(creativeReviews.creativeId, creativeId))
        .orderBy(desc(creativeReviews.reviewedAt));

      res.json({
        creative_id: row.creativeId,
        name: row.name,
        format: row.format,
        status: row.status,
        agent_url: row.agentUrl,
        principal_id: row.principalId,
        data: row.data,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
        reviews: reviews.map(r => ({
          review_id: r.reviewId,
          ai_decision: r.aiDecision,
          confidence_score: r.confidenceScore,
          policy_triggered: r.policyTriggered,
          reason: r.reason,
          human_override: r.humanOverride,
          final_decision: r.finalDecision,
          reviewed_at: r.reviewedAt,
        }))
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/creatives/:creativeId/analyze", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const creativeId = paramStr(req.params.creativeId);
      if (!creativeId) throw new NotFoundError("Creative", "undefined");

      const row = await getCreativeById(db, creativeId);
      if (!row || row.tenantId !== ctx.tenantId) {
        throw new NotFoundError("Creative", creativeId);
      }

      const config = getAiConfig(ctx.tenantId);
      if (!config) {
        res.status(500).json({ error: "AI configuration not found" });
        return;
      }

      const creativeData = (row.data as Record<string, unknown>) || {};
      const reviewResult = await reviewCreative(config, row.name, creativeData);

      // Insert review
      const reviewId = `rev_${Math.random().toString(36).substring(2, 9)}`;
      const newReview = await db.insert(creativeReviews).values({
        reviewId,
        creativeId,
        tenantId: ctx.tenantId,
        reviewType: "ai",
        aiDecision: reviewResult.decision,
        confidenceScore: reviewResult.confidence,
        reason: reviewResult.reason,
        finalDecision: reviewResult.decision, // initially same as AI decision
        humanOverride: false,
      }).returning();

      res.json({
        success: true,
        review: {
          review_id: newReview[0]!.reviewId,
          ai_decision: newReview[0]!.aiDecision,
          confidence_score: newReview[0]!.confidenceScore,
          reason: newReview[0]!.reason,
          final_decision: newReview[0]!.finalDecision,
        }
      });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/creatives/:creativeId/approve", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const creativeId = paramStr(req.params.creativeId);
      if (!creativeId) throw new NotFoundError("Creative", "undefined");

      const row = await getCreativeById(db, creativeId);
      if (!row || row.tenantId !== ctx.tenantId) {
        throw new NotFoundError("Creative", creativeId);
      }

      const updated = await db
        .update(creatives)
        .set({ status: "approved", updatedAt: new Date() })
        .where(and(eq(creatives.creativeId, creativeId), eq(creatives.tenantId, ctx.tenantId)))
        .returning();

      // Check if there was an AI decision to set humanOverride
      const latestReview = await db.select().from(creativeReviews)
        .where(eq(creativeReviews.creativeId, creativeId))
        .orderBy(desc(creativeReviews.reviewedAt))
        .limit(1);

      if (latestReview.length > 0) {
        const rev = latestReview[0]!;
        if (rev.aiDecision !== "approve") {
          await db.update(creativeReviews)
            .set({ humanOverride: true, finalDecision: "approve" })
            .where(eq(creativeReviews.reviewId, rev.reviewId));
        }
      }

      const r = updated[0]!;
      res.json({ success: true, creative_id: r.creativeId, status: r.status });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  router.post("/creatives/:creativeId/reject", async (req: Request, res: Response) => {
    try {
      const headers = headersFromNodeRequest(req);
      const result = await resolveFromHeaders(headers);
      const ctx = toToolContext(result);
      if (!ctx?.tenantId) throw new TenantError();
      const db = getDb();
      const creativeId = paramStr(req.params.creativeId);
      if (!creativeId) throw new NotFoundError("Creative", "undefined");

      const row = await getCreativeById(db, creativeId);
      if (!row || row.tenantId !== ctx.tenantId) {
        throw new NotFoundError("Creative", creativeId);
      }

      const updated = await db
        .update(creatives)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(and(eq(creatives.creativeId, creativeId), eq(creatives.tenantId, ctx.tenantId)))
        .returning();

      // Check if there was an AI decision to set humanOverride
      const latestReview = await db.select().from(creativeReviews)
        .where(eq(creativeReviews.creativeId, creativeId))
        .orderBy(desc(creativeReviews.reviewedAt))
        .limit(1);

      if (latestReview.length > 0) {
        const rev = latestReview[0]!;
        if (rev.aiDecision !== "reject") {
          await db.update(creativeReviews)
            .set({ humanOverride: true, finalDecision: "reject" })
            .where(eq(creativeReviews.reviewId, rev.reviewId));
        }
      }

      const r = updated[0]!;
      res.json({ success: true, creative_id: r.creativeId, status: r.status });
    } catch (err) {
      const { status, body } = toHttpError(err);
      res.status(status).json(body);
    }
  });

  return router;
}

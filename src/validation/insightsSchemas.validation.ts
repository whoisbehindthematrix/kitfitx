import { z } from "zod";

export const insightsSummaryQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  range: z.enum(["7d", "30d", "90d"]).optional(),
});

export type InsightsSummaryQueryInput = z.infer<typeof insightsSummaryQuerySchema>;

export const insightsRecommendationsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
});

export type InsightsRecommendationsQueryInput = z.infer<typeof insightsRecommendationsQuerySchema>;

export const insightsTrendsQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
});

export type InsightsTrendsQueryInput = z.infer<typeof insightsTrendsQuerySchema>;

import { z } from "zod";

export const predictionOverviewQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
});

export type PredictionOverviewQueryInput = z.infer<typeof predictionOverviewQuerySchema>;

export const predictionAskSchema = z.object({
  question: z.string().min(1, "Question is required").max(500, "Question too long"),
  context: z.enum(["health", "fertility", "mood", "general"]).optional().default("general"),
});

export type PredictionAskInput = z.infer<typeof predictionAskSchema>;

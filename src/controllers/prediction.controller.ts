import { Request, Response } from "express";
import ErrorHandler from "@/utils/errorHandler";
import { insightsService } from "../services/insights/insights.service";
import { fertilityService } from "../services/insights/fertility.service";
import { moodService } from "../services/insights/mood.service";
import { llmClient } from "../services/ai/llmClient";
import {
  predictionOverviewQuerySchema,
  predictionAskSchema,
} from "../validation/predictionSchemas.validation";
import prisma from "../lib/prismaClient";

/**
 * GET /api/predictions/overview
 * Get comprehensive prediction overview combining all services
 */
export const getPredictionOverview = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const parseResult = predictionOverviewQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid query parameters: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const { date } = parseResult.data;
  const targetDate = date ? new Date(date + "T00:00:00") : new Date();
  targetDate.setHours(0, 0, 0, 0);

  // Fetch all prediction data in parallel
  const [healthSummary, fertilityWindow, moodScore, predictionData] = await Promise.all([
    insightsService.getHealthSummary(userId, targetDate),
    fertilityService.estimateFertilityWindow(userId, targetDate),
    moodService.getDailyMoodScore(userId, targetDate),
    prisma.predictionData.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      date: targetDate.toISOString().split("T")[0],
      health: healthSummary,
      fertility: {
        ...fertilityWindow,
        windowStart: fertilityWindow.windowStart?.toISOString().split("T")[0] || null,
        windowPeak: fertilityWindow.windowPeak?.toISOString().split("T")[0] || null,
        windowEnd: fertilityWindow.windowEnd?.toISOString().split("T")[0] || null,
      },
      mood: moodScore,
      cyclePredictions: predictionData
        ? {
            nextPeriod: predictionData.nextPeriod?.toISOString().split("T")[0] || null,
            ovulation: predictionData.ovulation?.toISOString().split("T")[0] || null,
            fertileWindow: predictionData.fertileWindow,
            analytics: predictionData.analytics,
          }
        : null,
    },
  });
};

/**
 * POST /api/predictions/ask
 * Ask a question about user's health data (AI-powered)
 */
export const askPredictionQuestion = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  if (!llmClient.isAvailable()) {
    throw new ErrorHandler("AI prediction service is not available", 503);
  }

  const userId = user.sub;
  const parseResult = predictionAskSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid request body: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const { question, context } = parseResult.data;

  // Fetch relevant context data based on question context
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let contextData: Record<string, unknown> = {};

  if (context === "health" || context === "general") {
    const healthSummary = await insightsService.getHealthSummary(userId, today);
    contextData.health = healthSummary;
  }

  if (context === "fertility" || context === "general") {
    const fertilityWindow = await fertilityService.estimateFertilityWindow(userId, today);
    contextData.fertility = {
      score: fertilityWindow.fertilityScore,
      phase: fertilityWindow.phase,
      windowStart: fertilityWindow.windowStart?.toISOString().split("T")[0],
      windowEnd: fertilityWindow.windowEnd?.toISOString().split("T")[0],
    };
  }

  if (context === "mood" || context === "general") {
    const moodScore = await moodService.getDailyMoodScore(userId, today);
    contextData.mood = moodScore;
  }

  // Build prompt with context
  const prompt = `You are a helpful health and wellness assistant. A user is asking about their health data.

User's question: "${question}"

Relevant context from their health data:
${JSON.stringify(contextData, null, 2)}

IMPORTANT GUIDELINES:
- Provide a helpful, accurate answer based on the context provided
- Be supportive and non-judgmental
- Do NOT provide medical advice or diagnoses
- If you don't have enough information, say so
- Keep your answer concise (max 200 words)
- Focus on insights and suggestions, not medical recommendations

Answer the user's question:`;

  try {
    const answer = await llmClient.generateText(prompt);

    res.status(200).json({
      success: true,
      data: {
        question,
        answer,
        context: contextData,
      },
    });
  } catch (error) {
    console.error("LLM prediction question failed:", error);
    throw new ErrorHandler(
      "Failed to generate prediction answer. Please try again later.",
      502
    );
  }
};

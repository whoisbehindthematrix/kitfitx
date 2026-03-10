import { Request, Response } from "express";
import ErrorHandler from "@/utils/errorHandler";
import { insightsService } from "../services/insights/insights.service";
import { llmClient } from "../services/ai/llmClient";
import { InsightsPromptBuilder } from "../services/ai/insightsPromptBuilder";
import {
  insightsSummaryQuerySchema,
  insightsRecommendationsQuerySchema,
  insightsTrendsQuerySchema,
} from "../validation/insightsSchemas.validation";
import prisma from "../lib/prismaClient";

/**
 * GET /api/insights/summary
 * Get daily health summary for a specific date
 */
export const getHealthSummary = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const parseResult = insightsSummaryQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid query parameters: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const { date } = parseResult.data;
  const targetDate = date ? new Date(date + "T00:00:00") : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const summary = await insightsService.getHealthSummary(userId, targetDate);

  res.status(200).json({
    success: true,
    data: summary,
  });
};

/**
 * GET /api/insights/recommendations
 * Get AI-generated health recommendations
 */
export const getRecommendations = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const parseResult = insightsRecommendationsQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid query parameters: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const { date } = parseResult.data;
  const targetDate = date ? new Date(date + "T00:00:00") : new Date();
  targetDate.setHours(0, 0, 0, 0);

  // Get health summary first
  const summary = await insightsService.getHealthSummary(userId, targetDate);

  // Get user goals for context
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { wellnessGoals: true },
  });

  const userGoals = profile?.wellnessGoals || [];

  // Try to get AI recommendations, fallback to rule-based if LLM unavailable
  let recommendations: {
    title: string;
    recommendations: Array<{
      category: string;
      priority: string;
      action: string;
      reason: string;
    }>;
    warnings: string[];
  } | null = null;

  if (llmClient.isAvailable()) {
    try {
      const prompt = InsightsPromptBuilder.buildRecommendationsPrompt(summary, userGoals);
      const schemaHint = `{
  "title": "string",
  "recommendations": [{"category": "string", "priority": "string", "action": "string", "reason": "string"}],
  "warnings": ["string"]
}`;
      recommendations = await llmClient.generateJson(prompt, schemaHint);
    } catch (error) {
      console.error("LLM recommendation generation failed:", error);
      // Fall through to rule-based recommendations
    }
  }

  // Fallback to rule-based recommendations if LLM failed or unavailable
  if (!recommendations) {
    recommendations = generateRuleBasedRecommendations(summary);
  }

  res.status(200).json({
    success: true,
    data: {
      ...recommendations,
      summary,
    },
  });
};

/**
 * GET /api/insights/trends
 * Get health trends over a date range
 */
export const getTrends = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const parseResult = insightsTrendsQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid query parameters: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const { range, date } = parseResult.data;
  const endDate = date ? new Date(date + "T00:00:00") : new Date();
  endDate.setHours(23, 59, 59, 999);

  // Calculate start date based on range
  const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[range || "30d"];
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Limit to 90 days max
  if (days > 90) {
    throw new ErrorHandler("Maximum range is 90 days", 400);
  }

  const trends = await insightsService.getTrends(userId, startDate, endDate);

  res.status(200).json({
    success: true,
    data: {
      ...trends,
      range: range || "30d",
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    },
  });
};

/**
 * Generate rule-based recommendations when LLM is unavailable
 */
function generateRuleBasedRecommendations(summary: Awaited<ReturnType<typeof insightsService.getHealthSummary>>): {
  title: string;
  recommendations: Array<{
    category: string;
    priority: string;
    action: string;
    reason: string;
  }>;
  warnings: string[];
} {
  const recommendations: Array<{
    category: string;
    priority: string;
    action: string;
    reason: string;
  }> = [];
  const warnings: string[] = [];

  // Nutrition recommendations
  if (summary.nutrition) {
    if (summary.nutrition.score < 60) {
      if (summary.nutrition.totalCalories < (summary.nutrition.targetCalories || 2000) * 0.8) {
        recommendations.push({
          category: "nutrition",
          priority: "high",
          action: "Consider adding nutrient-dense snacks to meet your calorie goals",
          reason: "Your calorie intake is below target, which may affect energy levels",
        });
      } else if (summary.nutrition.totalCalories > (summary.nutrition.targetCalories || 2000) * 1.2) {
        recommendations.push({
          category: "nutrition",
          priority: "high",
          action: "Focus on portion control and mindful eating",
          reason: "Calorie intake exceeds target, which may impact your goals",
        });
      }
    }

    if (summary.nutrition.protein < 50) {
      recommendations.push({
        category: "nutrition",
        priority: "medium",
        action: "Add protein-rich foods to your meals (eggs, lean meat, legumes)",
        reason: "Adequate protein supports muscle health and satiety",
      });
    }
  } else {
    recommendations.push({
      category: "nutrition",
      priority: "medium",
      action: "Start logging your meals to track nutrition",
      reason: "Tracking helps you understand your eating patterns",
    });
  }

  // Activity recommendations
  if (summary.activity) {
    if (summary.activity.score < 60) {
      recommendations.push({
        category: "activity",
        priority: summary.activity.score < 40 ? "high" : "medium",
        action: "Aim for at least 30 minutes of moderate activity today",
        reason: "Regular exercise supports overall health and mood",
      });
    }
  } else {
    recommendations.push({
      category: "activity",
      priority: "medium",
      action: "Add some movement to your day - even a 10-minute walk helps",
      reason: "Physical activity improves both physical and mental well-being",
    });
  }

  // Mood recommendations
  if (summary.moodScore && summary.moodScore.score < 50) {
    recommendations.push({
      category: "mood",
      priority: "high",
      action: "Take time for self-care activities you enjoy",
      reason: "Prioritizing your mental well-being is important",
    });

    if (summary.phase === "luteal" || summary.phase === "menstrual") {
      warnings.push("You're in a phase where mood fluctuations are common - be gentle with yourself");
    }
  }

  // Cycle-specific recommendations
  if (summary.phase === "luteal") {
    recommendations.push({
      category: "cycle",
      priority: "low",
      action: "Consider reducing caffeine and increasing magnesium-rich foods",
      reason: "These can help manage common luteal phase symptoms",
    });
  }

  return {
    title: "Your Personalized Health Recommendations",
    recommendations: recommendations.length > 0 ? recommendations : [
      {
        category: "general",
        priority: "low",
        action: "Keep up the great work! Maintain your current healthy habits",
        reason: "Your health scores are looking good",
      },
    ],
    warnings,
  };
}

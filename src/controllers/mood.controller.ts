import { Request, Response } from "express";
import ErrorHandler from "@/utils/errorHandler";
import { moodService } from "../services/insights/mood.service";
import { moodScoreQuerySchema } from "../validation/moodSchemas.validation";
import { llmClient } from "../services/ai/llmClient";
import { insightsService } from "../services/insights/insights.service";
import { InsightsPromptBuilder } from "../services/ai/insightsPromptBuilder";

/**
 * GET /api/mood/score
 * Get mood score for a specific date
 */
export const getMoodScore = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const parseResult = moodScoreQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid query parameters: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const { date } = parseResult.data;
  const targetDate = date ? new Date(date + "T00:00:00") : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const moodScore = await moodService.getDailyMoodScore(userId, targetDate);

  // Get cycle phase for context
  const phase = await insightsService.getCyclePhase(userId, targetDate);

  // Optionally add AI support message if LLM is available
  let supportMessage: string | null = null;
  if (llmClient.isAvailable() && moodScore.score < 70) {
    try {
      const prompt = InsightsPromptBuilder.buildMoodSupportPrompt(moodScore.score, phase);
      supportMessage = await llmClient.generateText(prompt);
    } catch (error) {
      console.error("LLM mood support generation failed:", error);
      // Continue without support message
    }
  }

  res.status(200).json({
    success: true,
    data: {
      ...moodScore,
      phase,
      supportMessage,
    },
  });
};

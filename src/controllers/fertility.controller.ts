import { Request, Response } from "express";
import ErrorHandler from "@/utils/errorHandler";
import { fertilityService } from "../services/insights/fertility.service";
import { fertilityScoreQuerySchema } from "../validation/fertilitySchemas.validation";
import { llmClient } from "../services/ai/llmClient";

/**
 * GET /api/fertility/score
 * Get fertility score and window for a specific date
 */
export const getFertilityScore = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const parseResult = fertilityScoreQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid query parameters: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const { date } = parseResult.data;
  const targetDate = date ? new Date(date + "T00:00:00") : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const fertilityWindow = await fertilityService.estimateFertilityWindow(userId, targetDate);

  // Optionally add AI explanation if LLM is available
  let explanation: string | null = null;
  if (llmClient.isAvailable() && fertilityWindow.confidence !== "low") {
    try {
      const prompt = `You are a health assistant. The user's fertility score for ${targetDate.toISOString().split("T")[0]} is ${(fertilityWindow.fertilityScore * 100).toFixed(0)}/100.

Cycle phase: ${fertilityWindow.phase}
Fertile window: ${fertilityWindow.windowStart ? fertilityWindow.windowStart.toISOString().split("T")[0] : "N/A"} to ${fertilityWindow.windowEnd ? fertilityWindow.windowEnd.toISOString().split("T")[0] : "N/A"}
Peak: ${fertilityWindow.windowPeak ? fertilityWindow.windowPeak.toISOString().split("T")[0] : "N/A"}
Confidence: ${fertilityWindow.confidence}

Provide a brief, clear explanation (2-3 sentences, max 100 words) about what this fertility score means and when the fertile window occurs. Be factual and supportive.`;

      explanation = await llmClient.generateText(prompt);
    } catch (error) {
      console.error("LLM explanation generation failed:", error);
      // Continue without explanation
    }
  }

  res.status(200).json({
    success: true,
    data: {
      ...fertilityWindow,
      windowStart: fertilityWindow.windowStart?.toISOString().split("T")[0] || null,
      windowPeak: fertilityWindow.windowPeak?.toISOString().split("T")[0] || null,
      windowEnd: fertilityWindow.windowEnd?.toISOString().split("T")[0] || null,
      explanation,
    },
  });
};

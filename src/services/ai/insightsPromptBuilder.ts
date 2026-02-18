import { HealthInsightsSummary } from "../insights/insights.service";

/**
 * Builds structured prompts for LLM-based health insights
 */
export class InsightsPromptBuilder {
  /**
   * Build prompt for daily health summary
   */
  static buildDailySummaryPrompt(summary: HealthInsightsSummary): string {
    const { phase, nutrition, activity, moodScore, overallScore } = summary;

    return `You are a health and wellness assistant helping a user understand their daily health status.

User's current health data:
- Menstrual cycle phase: ${phase || "unknown"}
- Nutrition score: ${nutrition?.score || 0}/100 (Target: ${nutrition?.targetCalories || "not set"} calories, Actual: ${nutrition?.totalCalories || 0} calories)
- Activity score: ${activity?.score || 0}/100 (${activity?.minutes || 0} minutes of activity, ${activity?.sessions || 0} sessions)
- Mood score: ${moodScore?.score || "N/A"}/100
- Overall health score: ${overallScore || 0}/100

${nutrition?.carbs ? `Macros breakdown: Carbs ${nutrition.carbs}g, Protein ${nutrition.protein}g, Fat ${nutrition.fat}g` : ""}

Provide a brief, encouraging daily summary (2-3 bullet points, max 100 words) that:
1. Highlights what's going well
2. Gently suggests one area for improvement if score is below 70
3. Is supportive and non-judgmental

Respond in a friendly, conversational tone.`;
  }

  /**
   * Build prompt for health recommendations
   */
  static buildRecommendationsPrompt(summary: HealthInsightsSummary, userGoals?: string[]): string {
    const { phase, nutrition, activity, moodScore, overallScore } = summary;

    const goalsContext = userGoals && userGoals.length > 0 
      ? `User's wellness goals: ${userGoals.join(", ")}`
      : "";

    return `You are a health and wellness assistant providing personalized recommendations.

User's current health status:
- Menstrual cycle phase: ${phase || "unknown"}
- Nutrition score: ${nutrition?.score || 0}/100
- Activity score: ${activity?.score || 0}/100
- Mood score: ${moodScore?.score || "N/A"}/100
- Overall health score: ${overallScore || 0}/100

${goalsContext}

Provide 3-5 concrete, actionable recommendations as a JSON object with this structure:
{
  "title": "Brief title for the recommendations",
  "recommendations": [
    {
      "category": "nutrition" | "activity" | "mood" | "cycle" | "general",
      "priority": "high" | "medium" | "low",
      "action": "Specific action item (e.g., 'Add a protein-rich snack in the afternoon')",
      "reason": "Brief explanation why this helps"
    }
  ],
  "warnings": ["Any important warnings or cautions, if applicable"]
}

Focus on the lowest-scoring areas first. Be specific, practical, and supportive.`;
  }

  /**
   * Build prompt for mood support text
   */
  static buildMoodSupportPrompt(moodScore: number, phase?: string): string {
    return `You are a compassionate wellness assistant. The user's current mood score is ${moodScore}/100.

${phase ? `They are in the ${phase} phase of their menstrual cycle.` : ""}

Provide a brief, supportive message (2-3 sentences, max 80 words) that:
1. Validates their feelings
2. Offers gentle self-care suggestions
3. Is warm and non-clinical

Avoid medical advice. Focus on emotional support and practical self-care.`;
  }
}

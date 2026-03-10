import prisma from "../../lib/prismaClient";
import { CyclePhase } from "./insights.service";
import { insightsService } from "./insights.service";

export interface MoodMetrics {
  score: number; // 0-100
  label: "low" | "medium" | "high";
  drivers: string[];
}

/**
 * Mood prediction service
 * Analyzes mood based on notes, symptoms, and cycle phase
 */
export class MoodService {
  /**
   * Get daily mood score for a specific date
   */
  async getDailyMoodScore(userId: string, date: Date): Promise<MoodMetrics> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get cycle phase
    const phase = await insightsService.getCyclePhase(userId, date);

    // Get quick notes for the day
    const notes = await prisma.quickNote.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Get cycle entries with symptoms
    const cycleEntries = await prisma.cycleEntry.findMany({
      where: {
        userId,
        date: {
          gte: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          lte: date,
        },
      },
    });

    // Get onboarding questions for stress/PMS context
    const onboardingQuestions = await prisma.onboardingQuestions.findUnique({
      where: { userId },
    });

    // Calculate base score from notes
    let baseScore = 50; // Neutral starting point
    const drivers: string[] = [];

    // Analyze note icons and text for mood indicators
    const moodKeywords = {
      positive: ["happy", "good", "great", "excited", "calm", "peaceful", "grateful", "love"],
      negative: ["sad", "anxious", "stressed", "tired", "angry", "frustrated", "worried", "pain"],
    };

    for (const note of notes) {
      const text = (note.text || "").toLowerCase();
      const icon = (note.icon || "").toLowerCase();

      // Check for positive indicators
      if (moodKeywords.positive.some((keyword) => text.includes(keyword) || icon.includes(keyword))) {
        baseScore += 10;
        drivers.push("Positive notes logged");
      }

      // Check for negative indicators
      if (moodKeywords.negative.some((keyword) => text.includes(keyword) || icon.includes(keyword))) {
        baseScore -= 15;
        drivers.push("Negative mood indicators in notes");
      }
    }

    // Factor in cycle phase (luteal phase often associated with PMS)
    if (phase === "luteal") {
      baseScore -= 10;
      drivers.push("Luteal phase (may experience PMS)");
    } else if (phase === "menstrual") {
      baseScore -= 5;
      drivers.push("Menstrual phase");
    } else if (phase === "ovulatory" || phase === "follicular") {
      baseScore += 5;
      drivers.push("Favorable cycle phase");
    }

    // Factor in symptoms from cycle entries
    const recentEntry = cycleEntries.find((entry) => {
      const entryDate = new Date(entry.date);
      return (
        entryDate.getTime() >= startOfDay.getTime() &&
        entryDate.getTime() <= endOfDay.getTime()
      );
    });

    if (recentEntry?.symptoms) {
      const symptoms = recentEntry.symptoms as Record<string, unknown>;
      const symptomKeys = Object.keys(symptoms);

      // Negative symptoms reduce mood score
      const negativeSymptoms = ["cramps", "bloating", "headache", "fatigue", "irritability"];
      const hasNegativeSymptoms = symptomKeys.some((key) =>
        negativeSymptoms.some((symptom) => key.toLowerCase().includes(symptom))
      );

      if (hasNegativeSymptoms) {
        baseScore -= 10;
        drivers.push("Physical symptoms reported");
      }
    }

    // Factor in stress level from onboarding
    if (onboardingQuestions?.stressLevel) {
      const stressLevel = onboardingQuestions.stressLevel.toLowerCase();
      if (stressLevel.includes("high") || stressLevel.includes("very")) {
        baseScore -= 15;
        drivers.push("High stress level reported");
      } else if (stressLevel.includes("medium") || stressLevel.includes("moderate")) {
        baseScore -= 5;
        drivers.push("Moderate stress level");
      }
    }

    // Factor in PMS mood from onboarding
    if (onboardingQuestions?.pmsMood) {
      const pmsMood = onboardingQuestions.pmsMood.toLowerCase();
      if (pmsMood.includes("irritable") || pmsMood.includes("sad") || pmsMood.includes("anxious")) {
        if (phase === "luteal") {
          baseScore -= 10;
          drivers.push("PMS mood patterns");
        }
      }
    }

    // Factor in activity (exercise can improve mood)
    const workoutSessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (workoutSessions.length > 0) {
      baseScore += 10;
      drivers.push("Exercise completed");
    }

    // Clamp score between 0-100
    const finalScore = Math.max(0, Math.min(100, baseScore));

    // Determine label
    let label: "low" | "medium" | "high";
    if (finalScore < 40) {
      label = "low";
    } else if (finalScore < 70) {
      label = "medium";
    } else {
      label = "high";
    }

    return {
      score: Math.round(finalScore),
      label,
      drivers: drivers.length > 0 ? drivers : ["No specific mood indicators"],
    };
  }
}

export const moodService = new MoodService();

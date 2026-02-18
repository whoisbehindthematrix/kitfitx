import prisma from "../../lib/prismaClient";
import { fertilityService } from "./fertility.service";
import { moodService } from "./mood.service";

export type CyclePhase = "menstrual" | "follicular" | "ovulatory" | "luteal" | "unknown";

export interface NutritionMetrics {
  score: number;
  totalCalories: number;
  targetCalories: number | null;
  carbs: number;
  protein: number;
  fat: number;
}

export interface ActivityMetrics {
  score: number;
  minutes: number;
  sessions: number;
}

export interface MoodMetrics {
  score: number;
  label: "low" | "medium" | "high";
  drivers: string[];
}

export interface HealthInsightsSummary {
  date: string;
  phase: CyclePhase;
  nutrition: NutritionMetrics | null;
  activity: ActivityMetrics | null;
  moodScore: MoodMetrics | null;
  overallScore: number;
}

/**
 * Core health insights service
 * Aggregates data from multiple Prisma models and computes health scores
 */
export class InsightsService {
  /**
   * Get health summary for a specific date
   */
  async getHealthSummary(userId: string, date: Date): Promise<HealthInsightsSummary> {
    const dateStr = date.toISOString().split("T")[0];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch user profile for goals
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    const onboarding = await prisma.onboarding.findUnique({
      where: { userId },
    });

    const targetCalories = profile?.dailyCalorieGoal || onboarding?.dailyCalorieGoal || null;

    // Fetch cycle data
    const cyclePhase = await this.getCyclePhase(userId, date);

    // Fetch nutrition data
    const nutrition = await this.getNutritionMetrics(userId, startOfDay, endOfDay, targetCalories);

    // Fetch activity data
    const activity = await this.getActivityMetrics(userId, startOfDay, endOfDay);

    // Fetch mood data
    const moodScore = await moodService.getDailyMoodScore(userId, date);

    // Calculate overall score (weighted average)
    const overallScore = this.calculateOverallScore(nutrition, activity, moodScore);

    return {
      date: dateStr,
      phase: cyclePhase,
      nutrition,
      activity,
      moodScore,
      overallScore,
    };
  }

  /**
   * Get cycle phase for a given date
   */
  async getCyclePhase(userId: string, date: Date): Promise<CyclePhase> {
    // Check for existing prediction data
    const prediction = await prisma.predictionData.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (prediction?.fertileWindow) {
      const fertileWindow = prediction.fertileWindow as { start?: string; peak?: string; end?: string };
      const peakDate = fertileWindow.peak ? new Date(fertileWindow.peak) : null;
      const windowStart = fertileWindow.start ? new Date(fertileWindow.start) : null;
      const windowEnd = fertileWindow.end ? new Date(fertileWindow.end) : null;

      if (peakDate && date >= new Date(peakDate.getTime() - 1 * 24 * 60 * 60 * 1000) && 
          date <= new Date(peakDate.getTime() + 1 * 24 * 60 * 60 * 1000)) {
        return "ovulatory";
      }
      if (windowStart && windowEnd && date >= windowStart && date <= windowEnd) {
        return "ovulatory";
      }
    }

    // Check cycle entries for period
    const cycleEntries = await prisma.cycleEntry.findMany({
      where: {
        userId,
        date: {
          gte: new Date(date.getTime() - 14 * 24 * 60 * 60 * 1000), // Last 14 days
          lte: date,
        },
      },
      orderBy: { date: "desc" },
    });

    const recentPeriod = cycleEntries.find((entry) => entry.isPeriod);
    if (recentPeriod) {
      const daysSincePeriod = Math.floor(
        (date.getTime() - recentPeriod.date.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (daysSincePeriod <= 5) {
        return "menstrual";
      }
      if (daysSincePeriod <= 14) {
        return "follicular";
      }
      if (daysSincePeriod <= 16) {
        return "ovulatory";
      }
      return "luteal";
    }

    // Fallback: use profile data to estimate
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (profile?.lastPeriodStart) {
      const daysSincePeriod = Math.floor(
        (date.getTime() - profile.lastPeriodStart.getTime()) / (24 * 60 * 60 * 1000)
      );
      const cycleLength = profile.averageCycleLength || 28;
      const lutealDays = profile.lutealPhaseDays || 14;

      if (daysSincePeriod <= profile.periodDuration || 0) {
        return "menstrual";
      }
      if (daysSincePeriod <= cycleLength - lutealDays - 2) {
        return "follicular";
      }
      if (daysSincePeriod <= cycleLength - lutealDays + 2) {
        return "ovulatory";
      }
      return "luteal";
    }

    return "unknown";
  }

  /**
   * Get nutrition metrics for a date range
   */
  private async getNutritionMetrics(
    userId: string,
    startDate: Date,
    endDate: Date,
    targetCalories: number | null
  ): Promise<NutritionMetrics | null> {
    const foodLogs = await prisma.foodLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        globalFood: true,
        scannedFood: true,
      },
    });

    if (foodLogs.length === 0) {
      return null;
    }

    let totalCalories = 0;
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;

    for (const log of foodLogs) {
      const food = log.globalFood || log.scannedFood;
      if (food) {
        const multiplier = log.quantity || 1;
        totalCalories += food.calories * multiplier;
        totalCarbs += food.carbsGrams * multiplier;
        totalProtein += food.proteinGrams * multiplier;
        totalFat += food.fatGrams * multiplier;
      }
    }

    // Calculate score (0-100)
    let score = 50; // Base score
    if (targetCalories) {
      const calorieDiff = Math.abs(totalCalories - targetCalories);
      const caloriePercentDiff = (calorieDiff / targetCalories) * 100;
      if (caloriePercentDiff <= 10) {
        score = 90;
      } else if (caloriePercentDiff <= 20) {
        score = 75;
      } else if (caloriePercentDiff <= 30) {
        score = 60;
      } else {
        score = Math.max(30, 60 - (caloriePercentDiff - 30));
      }
    } else {
      // No target set, give moderate score if they logged food
      score = 60;
    }

    return {
      score: Math.round(score),
      totalCalories: Math.round(totalCalories),
      targetCalories,
      carbs: Math.round(totalCarbs * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
    };
  }

  /**
   * Get activity metrics for a date range
   */
  private async getActivityMetrics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ActivityMetrics | null> {
    const workoutSessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const exerciseEntries = await prisma.exerciseEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalMinutes =
      workoutSessions.reduce((sum, session) => sum + (session.durationMinutes || 0), 0) +
      exerciseEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);

    const totalSessions = workoutSessions.length + exerciseEntries.length;

    if (totalSessions === 0 && totalMinutes === 0) {
      return null;
    }

    // Calculate score based on activity level (simple heuristic)
    // Target: ~30 minutes/day or 3-4 sessions/week
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) || 1;
    const targetMinutesPerDay = 30;
    const targetMinutes = targetMinutesPerDay * daysDiff;

    let score = 50;
    if (totalMinutes >= targetMinutes * 0.9) {
      score = 90;
    } else if (totalMinutes >= targetMinutes * 0.7) {
      score = 75;
    } else if (totalMinutes >= targetMinutes * 0.5) {
      score = 60;
    } else if (totalMinutes > 0) {
      score = 40;
    } else {
      score = 20;
    }

    return {
      score: Math.round(score),
      minutes: totalMinutes,
      sessions: totalSessions,
    };
  }

  /**
   * Calculate overall health score from component scores
   */
  private calculateOverallScore(
    nutrition: NutritionMetrics | null,
    activity: ActivityMetrics | null,
    mood: MoodMetrics | null
  ): number {
    const scores: number[] = [];
    const weights: number[] = [];

    if (nutrition) {
      scores.push(nutrition.score);
      weights.push(0.4); // Nutrition is 40% weight
    }

    if (activity) {
      scores.push(activity.score);
      weights.push(0.3); // Activity is 30% weight
    }

    if (mood) {
      scores.push(mood.score);
      weights.push(0.3); // Mood is 30% weight
    }

    if (scores.length === 0) {
      return 50; // Default score if no data
    }

    // Normalize weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map((w) => w / totalWeight);

    // Calculate weighted average
    const weightedSum = scores.reduce(
      (sum, score, index) => sum + score * normalizedWeights[index],
      0
    );

    return Math.round(weightedSum);
  }

  /**
   * Get trends over a date range
   */
  async getTrends(userId: string, startDate: Date, endDate: Date) {
    const summaries: HealthInsightsSummary[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const summary = await this.getHealthSummary(userId, new Date(currentDate));
      summaries.push(summary);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      summaries,
      averageOverallScore:
        summaries.reduce((sum, s) => sum + s.overallScore, 0) / summaries.length || 0,
      averageNutritionScore:
        summaries
          .filter((s) => s.nutrition)
          .reduce((sum, s) => sum + (s.nutrition?.score || 0), 0) /
          summaries.filter((s) => s.nutrition).length || 0,
      averageActivityScore:
        summaries
          .filter((s) => s.activity)
          .reduce((sum, s) => sum + (s.activity?.score || 0), 0) /
          summaries.filter((s) => s.activity).length || 0,
    };
  }
}

export const insightsService = new InsightsService();

import prisma from "../../lib/prismaClient";
import { CyclePhase } from "./insights.service";

export interface FertilityWindow {
  phase: CyclePhase;
  fertilityScore: number; // 0-1 scale
  windowStart: Date | null;
  windowPeak: Date | null;
  windowEnd: Date | null;
  confidence: "high" | "medium" | "low";
}

/**
 * Fertility scoring service
 * Estimates fertility window based on cycle data
 */
export class FertilityService {
  /**
   * Estimate fertility window for a given date
   */
  async estimateFertilityWindow(userId: string, referenceDate: Date): Promise<FertilityWindow> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    const onboarding = await prisma.onboarding.findUnique({
      where: { userId },
    });

    // Get cycle parameters
    const averageCycleLength = profile?.averageCycleLength || onboarding?.averageCycleLength || 28;
    const lutealPhaseDays = profile?.lutealPhaseDays || 14;
    const lastPeriodStart = profile?.lastPeriodStart || onboarding?.lastPeriodStart;

    // Check for existing prediction data
    const prediction = await prisma.predictionData.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (prediction?.fertileWindow) {
      const fertileWindow = prediction.fertileWindow as {
        start?: string;
        peak?: string;
        end?: string;
        confidence?: string;
      };

      return {
        phase: this.getPhaseFromDate(referenceDate, lastPeriodStart, averageCycleLength, lutealPhaseDays),
        fertilityScore: this.calculateFertilityScore(referenceDate, fertileWindow),
        windowStart: fertileWindow.start ? new Date(fertileWindow.start) : null,
        windowPeak: fertileWindow.peak ? new Date(fertileWindow.peak) : null,
        windowEnd: fertileWindow.end ? new Date(fertileWindow.end) : null,
        confidence: (fertileWindow.confidence as "high" | "medium" | "low") || "medium",
      };
    }

    // Calculate fertility window based on cycle data
    if (!lastPeriodStart) {
      return {
        phase: "unknown",
        fertilityScore: 0,
        windowStart: null,
        windowPeak: null,
        windowEnd: null,
        confidence: "low",
      };
    }

    const daysSincePeriod = Math.floor(
      (referenceDate.getTime() - lastPeriodStart.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Ovulation typically occurs ~14 days before next period
    // Fertile window: 5 days before ovulation to 1 day after
    const ovulationDay = averageCycleLength - lutealPhaseDays;
    const fertileWindowStart = ovulationDay - 5;
    const fertileWindowPeak = ovulationDay;
    const fertileWindowEnd = ovulationDay + 1;

    const windowStart = new Date(lastPeriodStart);
    windowStart.setDate(windowStart.getDate() + fertileWindowStart);

    const windowPeak = new Date(lastPeriodStart);
    windowPeak.setDate(windowPeak.getDate() + fertileWindowPeak);

    const windowEnd = new Date(lastPeriodStart);
    windowEnd.setDate(windowEnd.getDate() + fertileWindowEnd);

    const fertilityScore = this.calculateFertilityScoreFromDays(
      daysSincePeriod,
      fertileWindowStart,
      fertileWindowEnd
    );

    return {
      phase: this.getPhaseFromDate(referenceDate, lastPeriodStart, averageCycleLength, lutealPhaseDays),
      fertilityScore,
      windowStart,
      windowPeak,
      windowEnd,
      confidence: this.calculateConfidence(profile, onboarding),
    };
  }

  /**
   * Calculate fertility score (0-1) based on date relative to fertile window
   */
  private calculateFertilityScore(
    date: Date,
    fertileWindow: { start?: string; peak?: string; end?: string }
  ): number {
    if (!fertileWindow.start || !fertileWindow.end) {
      return 0;
    }

    const windowStart = new Date(fertileWindow.start);
    const windowEnd = new Date(fertileWindow.end);
    const peak = fertileWindow.peak ? new Date(fertileWindow.peak) : null;

    if (date < windowStart || date > windowEnd) {
      return 0;
    }

    if (peak && Math.abs(date.getTime() - peak.getTime()) <= 24 * 60 * 60 * 1000) {
      return 1.0; // Peak fertility
    }

    // Linear decrease from peak
    const daysFromStart = Math.floor((date.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000));
    const windowLength = Math.floor((windowEnd.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0.3, 1.0 - (daysFromStart / windowLength) * 0.7);
  }

  /**
   * Calculate fertility score from days since period
   */
  private calculateFertilityScoreFromDays(
    daysSincePeriod: number,
    windowStart: number,
    windowEnd: number
  ): number {
    if (daysSincePeriod < windowStart || daysSincePeriod > windowEnd) {
      return 0;
    }

    const peakDay = Math.floor((windowStart + windowEnd) / 2);
    const distanceFromPeak = Math.abs(daysSincePeriod - peakDay);

    if (distanceFromPeak === 0) {
      return 1.0;
    }

    return Math.max(0.3, 1.0 - distanceFromPeak * 0.15);
  }

  /**
   * Get cycle phase from date
   */
  private getPhaseFromDate(
    date: Date,
    lastPeriodStart: Date | null,
    cycleLength: number,
    lutealDays: number
  ): CyclePhase {
    if (!lastPeriodStart) {
      return "unknown";
    }

    const daysSincePeriod = Math.floor(
      (date.getTime() - lastPeriodStart.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysSincePeriod <= 5) {
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

  /**
   * Calculate confidence level based on data availability
   */
  private calculateConfidence(
    profile: { averageCycleLength: number; lastPeriodStart: Date | null } | null,
    onboarding: { averageCycleLength: number } | null
  ): "high" | "medium" | "low" {
    if (profile?.lastPeriodStart && profile.averageCycleLength) {
      return "high";
    }
    if (onboarding?.averageCycleLength) {
      return "medium";
    }
    return "low";
  }
}

export const fertilityService = new FertilityService();

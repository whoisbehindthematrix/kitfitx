import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.string().optional(),
  timezone: z.string().optional(),
  averageCycleLength: z.number().optional(),
  periodDuration: z.number().optional(),
  lutealPhaseDays: z.number().optional(),
  lastPeriodStart: z.string().datetime().optional(),
  menopauseStatus: z.string().optional(),
  wellnessGoals: z.array(z.string()).optional(),
  dailyCalorieGoal: z.number().optional(),
  activityLevel: z.string().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  targetWeight: z.number().optional(),
  unitsSystem: z.enum(["metric", "imperial"]).optional(),
  theme: z.string().optional(),
  notifications: z.record(z.string(), z.any()).optional(), // Fix: Add second argument for value type
  language: z.string().optional(),
});

export const onboardingSchema = z.object({
  displayName: z.string().optional(),
  averageCycleLength: z.number(),
  lutealPhaseDays: z.number().optional(),
  age: z.number().optional(),
  dateOfBirth: z.string().datetime().optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
  wellnessGoals: z.array(z.string()).optional(),
});

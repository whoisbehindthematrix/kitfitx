"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().optional(),
    dateOfBirth: zod_1.z.string().datetime().optional(),
    gender: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional(),
    averageCycleLength: zod_1.z.number().optional(),
    periodDuration: zod_1.z.number().optional(),
    lutealPhaseDays: zod_1.z.number().optional(),
    lastPeriodStart: zod_1.z.string().datetime().optional(),
    menopauseStatus: zod_1.z.string().optional(),
    wellnessGoals: zod_1.z.array(zod_1.z.string()).optional(),
    dailyCalorieGoal: zod_1.z.number().optional(),
    activityLevel: zod_1.z.string().optional(),
    height: zod_1.z.number().optional(),
    weight: zod_1.z.number().optional(),
    targetWeight: zod_1.z.number().optional(),
    unitsSystem: zod_1.z.enum(["metric", "imperial"]).optional(),
    theme: zod_1.z.string().optional(),
    notifications: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(), // Fix: Add second argument for value type
    language: zod_1.z.string().optional(),
});
exports.onboardingSchema = zod_1.z.object({
    displayName: zod_1.z.string().optional(),
    averageCycleLength: zod_1.z.number(),
    lutealPhaseDays: zod_1.z.number().optional(),
    age: zod_1.z.number().optional(),
    dateOfBirth: zod_1.z.string().datetime().optional(),
    activityLevel: zod_1.z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
    wellnessGoals: zod_1.z.array(zod_1.z.string()).optional(),
});

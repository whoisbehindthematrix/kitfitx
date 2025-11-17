import { z } from "zod";
export const updateProfileSchema = z.object({
    fullName: z.string().optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.string().optional(),
    averageCycleLength: z.number().optional(),
    periodDuration: z.number().optional(),
    targetWeight: z.number().optional(),
    activityLevel: z.string().optional(),
    unitsSystem: z.enum(["metric", "imperial"]).optional(),
});

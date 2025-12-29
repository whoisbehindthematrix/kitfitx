import { z } from "zod";

// Food Category enum
const foodCategoryEnum = z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']);

// Food Source enum
const foodSourceEnum = z.enum(['AI', 'MANUAL']);

// ===========================================
// SCANNED FOOD SCHEMAS
// ===========================================

export const scannedFoodSchema = z.object({
  foodName: z.string().min(1, "Food name is required"),
  calories: z.number().int().min(0, "Calories must be non-negative"),
  proteinGrams: z.number().min(0, "Protein must be non-negative"),
  fatGrams: z.number().min(0, "Fat must be non-negative"),
  carbsGrams: z.number().min(0, "Carbs must be non-negative"),
  notes: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  source: foodSourceEnum.optional().default("AI"),
});

// ===========================================
// GLOBAL FOOD SCHEMAS
// ===========================================

export const globalFoodSchema = z.object({
  name: z.string().min(1, "Food name is required"),
  category: foodCategoryEnum,
  calories: z.number().int().min(0, "Calories must be non-negative"),
  proteinGrams: z.number().min(0, "Protein must be non-negative"),
  fatGrams: z.number().min(0, "Fat must be non-negative"),
  carbsGrams: z.number().min(0, "Carbs must be non-negative"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

export const updateGlobalFoodSchema = z.object({
  name: z.string().min(1).optional(),
  category: foodCategoryEnum.optional(),
  calories: z.number().int().min(0).optional(),
  proteinGrams: z.number().min(0).optional(),
  fatGrams: z.number().min(0).optional(),
  carbsGrams: z.number().min(0).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

// ===========================================
// FOOD LOG SCHEMAS
// ===========================================

export const foodLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  globalFoodId: z.string().optional(),
  scannedFoodId: z.string().optional(),
  quantity: z.number().positive().optional().default(1),
}).refine(
  (data) => data.globalFoodId || data.scannedFoodId,
  {
    message: "Either globalFoodId or scannedFoodId must be provided",
    path: ["globalFoodId"],
  }
).refine(
  (data) => !(data.globalFoodId && data.scannedFoodId),
  {
    message: "Cannot provide both globalFoodId and scannedFoodId",
    path: ["globalFoodId"],
  }
);

export const updateFoodLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  quantity: z.number().positive().optional(),
});


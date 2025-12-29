"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFoodLogSchema = exports.foodLogSchema = exports.updateGlobalFoodSchema = exports.globalFoodSchema = exports.scannedFoodSchema = void 0;
const zod_1 = require("zod");
// Food Category enum
const foodCategoryEnum = zod_1.z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']);
// Food Source enum
const foodSourceEnum = zod_1.z.enum(['AI', 'MANUAL']);
// ===========================================
// SCANNED FOOD SCHEMAS
// ===========================================
exports.scannedFoodSchema = zod_1.z.object({
    foodName: zod_1.z.string().min(1, "Food name is required"),
    calories: zod_1.z.number().int().min(0, "Calories must be non-negative"),
    proteinGrams: zod_1.z.number().min(0, "Protein must be non-negative"),
    fatGrams: zod_1.z.number().min(0, "Fat must be non-negative"),
    carbsGrams: zod_1.z.number().min(0, "Carbs must be non-negative"),
    notes: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    source: foodSourceEnum.optional().default("AI"),
});
// ===========================================
// GLOBAL FOOD SCHEMAS
// ===========================================
exports.globalFoodSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Food name is required"),
    category: foodCategoryEnum,
    calories: zod_1.z.number().int().min(0, "Calories must be non-negative"),
    proteinGrams: zod_1.z.number().min(0, "Protein must be non-negative"),
    fatGrams: zod_1.z.number().min(0, "Fat must be non-negative"),
    carbsGrams: zod_1.z.number().min(0, "Carbs must be non-negative"),
    imageUrl: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    isActive: zod_1.z.boolean().optional().default(true),
});
exports.updateGlobalFoodSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    category: foodCategoryEnum.optional(),
    calories: zod_1.z.number().int().min(0).optional(),
    proteinGrams: zod_1.z.number().min(0).optional(),
    fatGrams: zod_1.z.number().min(0).optional(),
    carbsGrams: zod_1.z.number().min(0).optional(),
    imageUrl: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    isActive: zod_1.z.boolean().optional(),
});
// ===========================================
// FOOD LOG SCHEMAS
// ===========================================
exports.foodLogSchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    globalFoodId: zod_1.z.string().optional(),
    scannedFoodId: zod_1.z.string().optional(),
    quantity: zod_1.z.number().positive().optional().default(1),
}).refine((data) => data.globalFoodId || data.scannedFoodId, {
    message: "Either globalFoodId or scannedFoodId must be provided",
    path: ["globalFoodId"],
}).refine((data) => !(data.globalFoodId && data.scannedFoodId), {
    message: "Cannot provide both globalFoodId and scannedFoodId",
    path: ["globalFoodId"],
});
exports.updateFoodLogSchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    quantity: zod_1.z.number().positive().optional(),
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeOnboardingSchema = exports.updateOnboardingQuestionsSchema = exports.onboardingQuestionsSchema = exports.updateOnboardingSchema = exports.onboardingSchema = void 0;
const zod_1 = require("zod");
// ===========================================
// ENUM DEFINITIONS
// ===========================================
const reproductiveStageEnum = zod_1.z.enum([
    'menstruating', 'postpartum', 'breastfeeding', 'perimenopause', 'menopause'
]);
const healthGoalEnum = zod_1.z.enum([
    'cycle_syncing', 'symptom_management', 'weight_management', 'fertility', 'mental_health'
]);
const birthControlEnum = zod_1.z.enum([
    'none', 'hormonal_pill', 'hormonal_iud', 'copper_iud', 'implant_injection_patch', 'tubal_ligation'
]);
const medicalDiagnosisEnum = zod_1.z.enum([
    'pcos', 'endometriosis', 'fibroids', 'hypothyroidism', 'hyperthyroidism', 'pmdd', 'none'
]);
const physicalSymptomEnum = zod_1.z.enum([
    'acne', 'bloating', 'cramps', 'fatigue', 'hair_issues', 'headaches', 'breast_tenderness'
]);
const pmsMoodEnum = zod_1.z.enum([
    'stable', 'mild', 'moderate', 'severe'
]);
const stressLevelEnum = zod_1.z.enum([
    'low', 'manageable', 'high', 'burnout'
]);
const foodStruggleEnum = zod_1.z.enum([
    'sugar_cravings', 'salty_carb_cravings', 'binge_eating', 'loss_of_appetite', 'none'
]);
const dietaryLifestyleEnum = zod_1.z.enum([
    'omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto_low_carb', 'gluten_free', 'dairy_free'
]);
const unitsSystemEnum = zod_1.z.enum(['metric', 'imperial']);
// ===========================================
// ONBOARDING SCHEMA (Basic Profile)
// ===========================================
exports.onboardingSchema = zod_1.z.object({
    // Profile Information
    dateOfBirth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
    // Physical Measurements
    weight: zod_1.z.number().positive().optional(),
    height: zod_1.z.number().positive().optional(),
    targetWeight: zod_1.z.number().positive().optional(),
    unitsSystem: unitsSystemEnum.optional(),
    // Nutrition
    dailyCalorieGoal: zod_1.z.number().int().min(0).max(10000).optional(),
    // Cycle Information (REQUIRED)
    averageCycleLength: zod_1.z.number().int().min(21).max(40).default(28),
    periodDuration: zod_1.z.number().int().min(1).max(7),
});
// Schema for PATCH requests (all fields optional)
exports.updateOnboardingSchema = zod_1.z.object({
    dateOfBirth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
    weight: zod_1.z.number().positive().optional(),
    height: zod_1.z.number().positive().optional(),
    targetWeight: zod_1.z.number().positive().optional(),
    unitsSystem: unitsSystemEnum.optional(),
    dailyCalorieGoal: zod_1.z.number().int().min(0).max(10000).optional(),
    averageCycleLength: zod_1.z.number().int().min(21).max(40).optional(),
    periodDuration: zod_1.z.number().int().min(1).max(7).optional(),
});
// ===========================================
// ONBOARDING QUESTIONS SCHEMA (Questionnaire)
// ===========================================
exports.onboardingQuestionsSchema = zod_1.z.object({
    // Health & Reproductive
    reproductiveStage: reproductiveStageEnum.optional(),
    healthGoal: healthGoalEnum.optional(),
    // Birth Control
    birthControl: zod_1.z.array(birthControlEnum).optional(),
    // Medical & Symptoms
    medicalDiagnoses: zod_1.z.array(medicalDiagnosisEnum).optional(),
    physicalSymptoms: zod_1.z.array(physicalSymptomEnum).max(3, "Maximum 3 physical symptoms allowed").optional(),
    // Mood & Stress
    pmsMood: pmsMoodEnum.optional(),
    stressLevel: stressLevelEnum.optional(),
    // Nutrition
    foodStruggles: zod_1.z.array(foodStruggleEnum).optional(),
    dietaryLifestyle: dietaryLifestyleEnum.optional(),
});
// Schema for PATCH requests (all fields optional)
exports.updateOnboardingQuestionsSchema = zod_1.z.object({
    reproductiveStage: reproductiveStageEnum.optional(),
    healthGoal: healthGoalEnum.optional(),
    birthControl: zod_1.z.array(birthControlEnum).optional(),
    medicalDiagnoses: zod_1.z.array(medicalDiagnosisEnum).optional(),
    physicalSymptoms: zod_1.z.array(physicalSymptomEnum).max(3, "Maximum 3 physical symptoms allowed").optional(),
    pmsMood: pmsMoodEnum.optional(),
    stressLevel: stressLevelEnum.optional(),
    foodStruggles: zod_1.z.array(foodStruggleEnum).optional(),
    dietaryLifestyle: dietaryLifestyleEnum.optional(),
});
// ===========================================
// COMPLETION SCHEMA
// ===========================================
exports.completeOnboardingSchema = zod_1.z.object({}).optional();

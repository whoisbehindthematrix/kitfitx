"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeOnboardingSchema = exports.updateOnboardingSchema = exports.onboardingSchema = void 0;
const zod_1 = require("zod");
// Enum definitions for validation
const weightRangeEnum = zod_1.z.enum([
    'under_45', '45_50', '50_55', '55_60', '60_65', '65_70',
    '70_75', '75_80', '80_85', '85_90', '90_95', '95_100',
    '100_110', '110_120', '120_plus'
]);
const heightRangeEnum = zod_1.z.enum([
    'under_4_10', '4_10', '4_11', '5_0', '5_1', '5_2', '5_3',
    '5_4', '5_5', '5_6', '5_7', '5_8', '5_9', '5_10', '5_11',
    '6_0', 'over_6_0'
]);
const reproductiveStageEnum = zod_1.z.enum([
    'menstruating', 'postpartum', 'breastfeeding', 'perimenopause', 'menopause'
]);
const healthGoalEnum = zod_1.z.enum([
    'cycle_syncing', 'symptom_management', 'weight_management', 'fertility', 'mental_health'
]);
const birthControlEnum = zod_1.z.enum([
    'none', 'hormonal_pill', 'hormonal_iud', 'copper_iud', 'implant_injection_patch', 'tubal_ligation'
]);
const cycleLengthEnum = zod_1.z.enum([
    'less_than_21', '21_24', '25_30', '31_35', 'longer_than_35', 'irregular'
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
// Main onboarding schema
exports.onboardingSchema = zod_1.z.object({
    // Profile Information (Optional)
    dateOfBirth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
    age: zod_1.z.number().int().min(0).max(150).optional(),
    // Cycle Information (Required for completion)
    averageCycleLength: zod_1.z.number().int().min(21).max(40).default(28),
    periodDuration: zod_1.z.number().int().min(1).max(7),
    // Optional Profile Fields
    weightRange: weightRangeEnum.optional(),
    heightRange: heightRangeEnum.optional(),
    reproductiveStage: reproductiveStageEnum.optional(),
    healthGoal: healthGoalEnum.optional(),
    // Birth Control (Optional)
    birthControl: zod_1.z.array(birthControlEnum).optional(),
    // Medical & Symptoms (Optional)
    medicalDiagnoses: zod_1.z.array(medicalDiagnosisEnum).optional(),
    physicalSymptoms: zod_1.z.array(physicalSymptomEnum).max(3, "Maximum 3 physical symptoms allowed").optional(),
    // Mood & Stress (Optional)
    pmsMood: pmsMoodEnum.optional(),
    stressLevel: stressLevelEnum.optional(),
    // Nutrition (Optional)
    foodStruggles: zod_1.z.array(foodStruggleEnum).optional(),
    dietaryLifestyle: dietaryLifestyleEnum.optional(),
    // Legacy fields
    cycleLength: cycleLengthEnum.optional(),
}).refine(() => {
    // If cycleLength is provided, it should be transformed to averageCycleLength
    // But we'll handle that in the controller
    return true;
}, { message: "Validation passed" });
// Schema for PATCH requests (all fields optional)
exports.updateOnboardingSchema = zod_1.z.object({
    dateOfBirth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
    age: zod_1.z.number().int().min(0).max(150).optional(),
    averageCycleLength: zod_1.z.number().int().min(21).max(40).optional(),
    periodDuration: zod_1.z.number().int().min(1).max(7).optional(),
    weightRange: weightRangeEnum.optional(),
    heightRange: heightRangeEnum.optional(),
    reproductiveStage: reproductiveStageEnum.optional(),
    healthGoal: healthGoalEnum.optional(),
    birthControl: zod_1.z.array(birthControlEnum).optional(),
    medicalDiagnoses: zod_1.z.array(medicalDiagnosisEnum).optional(),
    physicalSymptoms: zod_1.z.array(physicalSymptomEnum).max(3, "Maximum 3 physical symptoms allowed").optional(),
    pmsMood: pmsMoodEnum.optional(),
    stressLevel: stressLevelEnum.optional(),
    foodStruggles: zod_1.z.array(foodStruggleEnum).optional(),
    dietaryLifestyle: dietaryLifestyleEnum.optional(),
    cycleLength: cycleLengthEnum.optional(),
});
// Schema for completion endpoint (empty or optional confirmation)
exports.completeOnboardingSchema = zod_1.z.object({}).optional();

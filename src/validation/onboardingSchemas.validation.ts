import { z } from "zod";

// ===========================================
// ENUM DEFINITIONS
// ===========================================

const reproductiveStageEnum = z.enum([
  'menstruating', 'postpartum', 'breastfeeding', 'perimenopause', 'menopause'
]);

const healthGoalEnum = z.enum([
  'cycle_syncing', 'symptom_management', 'weight_management', 'fertility', 'mental_health'
]);

const birthControlEnum = z.enum([
  'none', 'hormonal_pill', 'hormonal_iud', 'copper_iud', 'implant_injection_patch', 'tubal_ligation'
]);

const medicalDiagnosisEnum = z.enum([
  'pcos', 'endometriosis', 'fibroids', 'hypothyroidism', 'hyperthyroidism', 'pmdd', 'none'
]);

const physicalSymptomEnum = z.enum([
  'acne', 'bloating', 'cramps', 'fatigue', 'hair_issues', 'headaches', 'breast_tenderness'
]);

const pmsMoodEnum = z.enum([
  'stable', 'mild', 'moderate', 'severe'
]);

const stressLevelEnum = z.enum([
  'low', 'manageable', 'high', 'burnout'
]);

const foodStruggleEnum = z.enum([
  'sugar_cravings', 'salty_carb_cravings', 'binge_eating', 'loss_of_appetite', 'none'
]);

const dietaryLifestyleEnum = z.enum([
  'omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto_low_carb', 'gluten_free', 'dairy_free'
]);

const unitsSystemEnum = z.enum(['metric', 'imperial']);

// ===========================================
// ONBOARDING SCHEMA (Basic Profile)
// ===========================================

export const onboardingSchema = z.object({
  // Profile Information
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  
  // Physical Measurements
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  targetWeight: z.number().positive().optional(),
  unitsSystem: unitsSystemEnum.optional(),
  
  // Nutrition
  dailyCalorieGoal: z.number().int().min(0).max(10000).optional(),
  
  // Cycle Information (REQUIRED)
  averageCycleLength: z.number().int().min(21).max(40).default(28),
  periodDuration: z.number().int().min(1).max(7),
});

// Schema for PATCH requests (all fields optional)
export const updateOnboardingSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  targetWeight: z.number().positive().optional(),
  unitsSystem: unitsSystemEnum.optional(),
  dailyCalorieGoal: z.number().int().min(0).max(10000).optional(),
  averageCycleLength: z.number().int().min(21).max(40).optional(),
  periodDuration: z.number().int().min(1).max(7).optional(),
});

// ===========================================
// ONBOARDING QUESTIONS SCHEMA (Questionnaire)
// ===========================================

export const onboardingQuestionsSchema = z.object({
  // Health & Reproductive
  reproductiveStage: reproductiveStageEnum.optional(),
  healthGoal: healthGoalEnum.optional(),
  
  // Birth Control
  birthControl: z.array(birthControlEnum).optional(),
  
  // Medical & Symptoms
  medicalDiagnoses: z.array(medicalDiagnosisEnum).optional(),
  physicalSymptoms: z.array(physicalSymptomEnum).max(3, "Maximum 3 physical symptoms allowed").optional(),
  
  // Mood & Stress
  pmsMood: pmsMoodEnum.optional(),
  stressLevel: stressLevelEnum.optional(),
  
  // Nutrition
  foodStruggles: z.array(foodStruggleEnum).optional(),
  dietaryLifestyle: dietaryLifestyleEnum.optional(),
});

// Schema for PATCH requests (all fields optional)
export const updateOnboardingQuestionsSchema = z.object({
  reproductiveStage: reproductiveStageEnum.optional(),
  healthGoal: healthGoalEnum.optional(),
  birthControl: z.array(birthControlEnum).optional(),
  medicalDiagnoses: z.array(medicalDiagnosisEnum).optional(),
  physicalSymptoms: z.array(physicalSymptomEnum).max(3, "Maximum 3 physical symptoms allowed").optional(),
  pmsMood: pmsMoodEnum.optional(),
  stressLevel: stressLevelEnum.optional(),
  foodStruggles: z.array(foodStruggleEnum).optional(),
  dietaryLifestyle: dietaryLifestyleEnum.optional(),
});

// ===========================================
// COMPLETION SCHEMA
// ===========================================

export const completeOnboardingSchema = z.object({}).optional();

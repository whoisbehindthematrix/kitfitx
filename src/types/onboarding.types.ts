// Type definitions for onboarding enums and interfaces

// ===========================================
// ENUMS
// ===========================================

export type ReproductiveStage =
  | 'menstruating' | 'postpartum' | 'breastfeeding' | 'perimenopause' | 'menopause';

export type HealthGoal =
  | 'cycle_syncing' | 'symptom_management' | 'weight_management' | 'fertility' | 'mental_health';

export type BirthControl =
  | 'none' | 'hormonal_pill' | 'hormonal_iud' | 'copper_iud' | 'implant_injection_patch' | 'tubal_ligation';

export type MedicalDiagnosis =
  | 'pcos' | 'endometriosis' | 'fibroids' | 'hypothyroidism' | 'hyperthyroidism' | 'pmdd' | 'none';

export type PhysicalSymptom =
  | 'acne' | 'bloating' | 'cramps' | 'fatigue' | 'hair_issues' | 'headaches' | 'breast_tenderness';

export type PMSMood =
  | 'stable' | 'mild' | 'moderate' | 'severe';

export type StressLevel =
  | 'low' | 'manageable' | 'high' | 'burnout';

export type FoodStruggle =
  | 'sugar_cravings' | 'salty_carb_cravings' | 'binge_eating' | 'loss_of_appetite' | 'none';

export type DietaryLifestyle =
  | 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto_low_carb' | 'gluten_free' | 'dairy_free';

export type UnitsSystem =
  | 'metric' | 'imperial';

// ===========================================
// ONBOARDING (Basic Profile)
// ===========================================

export interface OnboardingRequest {
  // Profile Information
  dateOfBirth?: string;           // ISO date string (YYYY-MM-DD)
  
  // Physical Measurements
  weight?: number;                 // Actual weight value
  height?: number;                 // Actual height value
  targetWeight?: number;
  unitsSystem?: UnitsSystem;        // "metric" | "imperial"
  
  // Nutrition
  dailyCalorieGoal?: number;
  
  // Cycle Information (REQUIRED)
  averageCycleLength: number;       // Integer (days) - REQUIRED
  periodDuration: number;           // Integer (days) - REQUIRED
}

export interface OnboardingResponse {
  success: boolean;
  data?: {
    id: string;
    userId: string;
    dateOfBirth?: string;
    weight?: number;
    height?: number;
    targetWeight?: number;
    unitsSystem?: UnitsSystem;
    dailyCalorieGoal?: number;
    averageCycleLength: number;
    periodDuration: number;
    isCompleted: boolean;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
}

// ===========================================
// ONBOARDING QUESTIONS (Questionnaire)
// ===========================================

export interface OnboardingQuestionsRequest {
  // Health & Reproductive
  reproductiveStage?: ReproductiveStage;
  healthGoal?: HealthGoal;
  
  // Birth Control
  birthControl?: BirthControl[];
  
  // Medical & Symptoms
  medicalDiagnoses?: MedicalDiagnosis[];
  physicalSymptoms?: PhysicalSymptom[];   // max 3
  
  // Mood & Stress
  pmsMood?: PMSMood;
  stressLevel?: StressLevel;
  
  // Nutrition
  foodStruggles?: FoodStruggle[];
  dietaryLifestyle?: DietaryLifestyle;
}

export interface OnboardingQuestionsResponse {
  success: boolean;
  data?: {
    id: string;
    userId: string;
    reproductiveStage?: ReproductiveStage;
    healthGoal?: HealthGoal;
    birthControl?: BirthControl[];
    medicalDiagnoses?: MedicalDiagnosis[];
    physicalSymptoms?: PhysicalSymptom[];
    pmsMood?: PMSMood;
    stressLevel?: StressLevel;
    foodStruggles?: FoodStruggle[];
    dietaryLifestyle?: DietaryLifestyle;
    isCompleted: boolean;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

export function calculateAgeFromDateOfBirth(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

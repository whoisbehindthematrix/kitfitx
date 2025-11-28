// Type definitions for onboarding enums

export type WeightRange =
  | 'under_45' | '45_50' | '50_55' | '55_60' | '60_65' | '65_70'
  | '70_75' | '75_80' | '80_85' | '85_90' | '90_95' | '95_100'
  | '100_110' | '110_120' | '120_plus';

export type HeightRange =
  | 'under_4_10' | '4_10' | '4_11' | '5_0' | '5_1' | '5_2' | '5_3'
  | '5_4' | '5_5' | '5_6' | '5_7' | '5_8' | '5_9' | '5_10' | '5_11'
  | '6_0' | 'over_6_0';

export type ReproductiveStage =
  | 'menstruating' | 'postpartum' | 'breastfeeding' | 'perimenopause' | 'menopause';

export type HealthGoal =
  | 'cycle_syncing' | 'symptom_management' | 'weight_management' | 'fertility' | 'mental_health';

export type BirthControl =
  | 'none' | 'hormonal_pill' | 'hormonal_iud' | 'copper_iud' | 'implant_injection_patch' | 'tubal_ligation';

export type CycleLength =
  | 'less_than_21' | '21_24' | '25_30' | '31_35' | 'longer_than_35' | 'irregular';

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

// Onboarding request/response types
export interface OnboardingRequest {
  // Profile Information (Optional)
  dateOfBirth?: string;           // ISO date string (YYYY-MM-DD)
  age?: number;                   // Integer (calculated from dateOfBirth if not provided)
  
  // Cycle Information (Required for completion)
  averageCycleLength: number;     // Integer (days) - REQUIRED
  periodDuration: number;         // Integer (days) - REQUIRED
  
  // Optional Profile Fields
  weightRange?: WeightRange;
  heightRange?: HeightRange;
  reproductiveStage?: ReproductiveStage;
  healthGoal?: HealthGoal;
  
  // Birth Control (Optional)
  birthControl?: BirthControl[];
  
  // Medical & Symptoms (Optional)
  medicalDiagnoses?: MedicalDiagnosis[];
  physicalSymptoms?: PhysicalSymptom[];   // max 3
  
  // Mood & Stress (Optional)
  pmsMood?: PMSMood;
  stressLevel?: StressLevel;
  
  // Nutrition (Optional)
  foodStruggles?: FoodStruggle[];
  dietaryLifestyle?: DietaryLifestyle;
  
  // Legacy fields
  cycleLength?: CycleLength;
}

export interface OnboardingResponse {
  success: boolean;
  data?: {
    id: string;
    userId: string;
    dateOfBirth?: string;
    age?: number;
    averageCycleLength: number;
    periodDuration: number;
    weightRange?: WeightRange;
    heightRange?: HeightRange;
    reproductiveStage?: ReproductiveStage;
    healthGoal?: HealthGoal;
    birthControl?: BirthControl[];
    medicalDiagnoses?: MedicalDiagnosis[];
    physicalSymptoms?: PhysicalSymptom[];
    pmsMood?: PMSMood;
    stressLevel?: StressLevel;
    foodStruggles?: FoodStruggle[];
    dietaryLifestyle?: DietaryLifestyle;
    cycleLength?: CycleLength;
    isCompleted: boolean;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  message?: string;
}

// Helper functions for data transformation
export function transformCycleLengthEnumToNumber(cycleLength?: CycleLength): number {
  if (!cycleLength) return 28; // default
  
  const mapping: Record<CycleLength, number> = {
    'less_than_21': 20,
    '21_24': 23,
    '25_30': 28,
    '31_35': 33,
    'longer_than_35': 36,
    'irregular': 28,
  };
  
  return mapping[cycleLength] || 28;
}

export function transformPeriodDurationEnumToNumber(periodDuration?: string): number {
  if (!periodDuration) return 5; // default
  
  const mapping: Record<string, number> = {
    '1_3': 2,
    '4_6': 5,
    '7_plus': 7,
  };
  
  return mapping[periodDuration] || 5;
}

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


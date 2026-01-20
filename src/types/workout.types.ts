// Type definitions for workout models
import { ExerciseCategory, ExerciseDifficulty } from "@prisma/client";

// ===========================================
// EXERCISE LIBRARY TYPES
// ===========================================

export type ExerciseCategoryType = ExerciseCategory;
export type ExerciseDifficultyType = ExerciseDifficulty;

// ===========================================
// TEMPLATE EXERCISE TYPES
// ===========================================

export interface TemplateExerciseConfig {
  exerciseId: string;
  exerciseName?: string;
  sets?: number;
  reps?: number[];
  weight?: number[];
  duration?: number;
  restSeconds?: number;
  notes?: string;
  order?: number;
}

export interface ExerciseLibraryData {
  id: string;
  name: string;
  category: ExerciseCategory;
  description: string | null;
  instructions: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  difficulty: ExerciseDifficulty | null;
  durationMinutes: number | null;
  caloriesPerMinute: number | null;
  phaseRecommendations: string[];
  imageUrl: string | null;
  videoUrl: string | null;
}

export interface TemplateExerciseWithDetails extends TemplateExerciseConfig {
  exercise?: ExerciseLibraryData | null;
  _warning?: string;
}

// ===========================================
// SESSION EXERCISE TYPES
// ===========================================

export interface SessionSet {
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number;
  completed?: boolean;
  restSeconds?: number;
  notes?: string;
}

export interface SessionExerciseInput {
  exerciseId: string;
  exerciseName?: string;
  category?: ExerciseCategory;
  sets: SessionSet[];
  order?: number;
  notes?: string;
}

export interface SessionExerciseWithDetails extends SessionExerciseInput {
  exercise?: ExerciseLibraryData | null;
  _warning?: string;
}

// ===========================================
// EXERCISE ENTRY TYPES (Cardio/Yoga)
// ===========================================

export interface ExerciseEntryResponse {
  id?: string;
  userId?: string;
  exerciseId: string | null;
  exerciseName: string;
  date: string;
  durationMinutes: number | null;
  caloriesBurned: number | null;
  distanceKm: number | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  exercise?: ExerciseLibraryData | null;
  _warning?: string;
}

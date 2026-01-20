import { z } from "zod";

// Exercise Category enum
const exerciseCategoryEnum = z.enum(['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'yoga', 'pilates', 'dance']);

// Exercise Difficulty enum
const exerciseDifficultyEnum = z.enum(['beginner', 'intermediate', 'advanced']);

// Phase recommendations enum
const phaseEnum = z.enum(['menstrual', 'follicular', 'ovulatory', 'luteal']);

// ===========================================
// EXERCISE LIBRARY SCHEMAS
// ===========================================

export const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  category: exerciseCategoryEnum,
  description: z.string().optional(),
  instructions: z.array(z.string()).optional().default([]),
  primaryMuscles: z.array(z.string()).optional().default([]),
  secondaryMuscles: z.array(z.string()).optional().default([]),
  equipment: z.array(z.string()).optional().default([]),
  difficulty: exerciseDifficultyEnum.optional(),
  durationMinutes: z.number().int().positive().optional(),
  caloriesPerMinute: z.number().nonnegative().optional(),
  phaseRecommendations: z.array(phaseEnum).optional().default([]),
  imageUrl: z.string().url().optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

export const updateExerciseSchema = z.object({
  name: z.string().min(1).optional(),
  category: exerciseCategoryEnum.optional(),
  description: z.string().optional().nullable(),
  instructions: z.array(z.string()).optional(),
  primaryMuscles: z.array(z.string()).optional(),
  secondaryMuscles: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  difficulty: exerciseDifficultyEnum.optional().nullable(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  caloriesPerMinute: z.number().nonnegative().optional().nullable(),
  phaseRecommendations: z.array(phaseEnum).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")).nullable(),
  videoUrl: z.string().url().optional().or(z.literal("")).nullable(),
  isActive: z.boolean().optional(),
});

// ===========================================
// WORKOUT TEMPLATE SCHEMAS
// ===========================================

// Exercise config schema for template exercises - NOW REQUIRES exerciseId
const exerciseConfigSchema = z.object({
  exerciseId: z.string().min(1, "Exercise ID is required"), // REQUIRED - links to ExerciseLibrary
  exerciseName: z.string().optional(), // Optional - will be populated from ExerciseLibrary
  sets: z.number().int().positive().optional(),
  reps: z.array(z.number().int().positive()).optional(), // [10, 10, 8] - reps per set
  weight: z.array(z.number().nonnegative()).optional(), // [20, 20, 22.5] - weight per set (kg/lbs)
  duration: z.number().int().positive().optional(), // seconds for time-based exercises
  restSeconds: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  order: z.number().int().nonnegative().optional(), // exercise order in workout
});

export const workoutTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: exerciseDifficultyEnum.optional(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  isPublic: z.boolean().optional().default(false),
  isSystemTemplate: z.boolean().optional().default(false),
  exercises: z.array(exerciseConfigSchema).min(1, "At least one exercise is required"),
});

export const updateWorkoutTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  difficulty: exerciseDifficultyEnum.optional().nullable(),
  estimatedDurationMinutes: z.number().int().positive().optional().nullable(),
  isPublic: z.boolean().optional(),
  exercises: z.array(exerciseConfigSchema).optional(),
});

// ===========================================
// WORKOUT SESSION SCHEMAS
// ===========================================

// Exercise set schema for completed workouts
const exerciseSetSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive().optional(),
  weight: z.number().nonnegative().optional(), // kg/lbs
  duration: z.number().int().positive().optional(), // seconds
  completed: z.boolean().optional().default(true),
  restSeconds: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

const sessionExerciseSchema = z.object({
  exerciseId: z.string().min(1, "Exercise ID is required"), // REQUIRED - links to ExerciseLibrary
  exerciseName: z.string().optional(), // Optional - populated from ExerciseLibrary
  category: exerciseCategoryEnum.optional(),
  sets: z.array(exerciseSetSchema),
  order: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export const workoutSessionSchema = z.object({
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().optional(),
  exercises: z.array(sessionExerciseSchema).min(1, "At least one exercise is required"),
  totalVolume: z.number().nonnegative().optional(),
  totalSets: z.number().int().nonnegative().optional(),
  totalReps: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  completed: z.boolean().optional().default(true),
});

export const updateWorkoutSessionSchema = z.object({
  templateId: z.string().optional().nullable(),
  templateName: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  exercises: z.array(sessionExerciseSchema).optional(),
  totalVolume: z.number().nonnegative().optional().nullable(),
  totalSets: z.number().int().nonnegative().optional().nullable(),
  totalReps: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  completed: z.boolean().optional(),
});

// ===========================================
// EXERCISE ENTRY SCHEMAS (Cardio/Yoga)
// ===========================================
// NOTE: ExerciseEntry is for SIMPLE cardio/yoga tracking (running, yoga, cycling)
// Different from WorkoutSession which tracks strength training with sets/reps/weight
// ExerciseEntry tracks: duration, distance, calories - simple metrics

export const exerciseEntrySchema = z.object({
  exerciseId: z.string().min(1, "Exercise ID is required"), // REQUIRED - links to ExerciseLibrary
  exerciseName: z.string().optional(), // Optional - auto-populated from ExerciseLibrary
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  durationMinutes: z.number().int().positive().optional(),
  caloriesBurned: z.number().int().nonnegative().optional(),
  distanceKm: z.number().nonnegative().optional(), // For running/cycling
  notes: z.string().optional(),
});

export const updateExerciseEntrySchema = z.object({
  exerciseId: z.string().min(1).optional().nullable(), // Can update to different exercise
  exerciseName: z.string().optional(), // Auto-populated if exerciseId provided
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  caloriesBurned: z.number().int().nonnegative().optional().nullable(),
  distanceKm: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExerciseEntrySchema = exports.exerciseEntrySchema = exports.updateWorkoutSessionSchema = exports.workoutSessionSchema = exports.updateWorkoutTemplateSchema = exports.workoutTemplateSchema = exports.updateExerciseSchema = exports.exerciseSchema = void 0;
const zod_1 = require("zod");
// Exercise Category enum
const exerciseCategoryEnum = zod_1.z.enum(['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'yoga', 'pilates', 'dance']);
// Exercise Difficulty enum
const exerciseDifficultyEnum = zod_1.z.enum(['beginner', 'intermediate', 'advanced']);
// Phase recommendations enum
const phaseEnum = zod_1.z.enum(['menstrual', 'follicular', 'ovulatory', 'luteal']);
// ===========================================
// EXERCISE LIBRARY SCHEMAS
// ===========================================
exports.exerciseSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Exercise name is required"),
    category: exerciseCategoryEnum,
    description: zod_1.z.string().optional(),
    instructions: zod_1.z.array(zod_1.z.string()).optional().default([]),
    primaryMuscles: zod_1.z.array(zod_1.z.string()).optional().default([]),
    secondaryMuscles: zod_1.z.array(zod_1.z.string()).optional().default([]),
    equipment: zod_1.z.array(zod_1.z.string()).optional().default([]),
    difficulty: exerciseDifficultyEnum.optional(),
    durationMinutes: zod_1.z.number().int().positive().optional(),
    caloriesPerMinute: zod_1.z.number().nonnegative().optional(),
    phaseRecommendations: zod_1.z.array(phaseEnum).optional().default([]),
    imageUrl: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    videoUrl: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    isActive: zod_1.z.boolean().optional().default(true),
});
exports.updateExerciseSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    category: exerciseCategoryEnum.optional(),
    description: zod_1.z.string().optional().nullable(),
    instructions: zod_1.z.array(zod_1.z.string()).optional(),
    primaryMuscles: zod_1.z.array(zod_1.z.string()).optional(),
    secondaryMuscles: zod_1.z.array(zod_1.z.string()).optional(),
    equipment: zod_1.z.array(zod_1.z.string()).optional(),
    difficulty: exerciseDifficultyEnum.optional().nullable(),
    durationMinutes: zod_1.z.number().int().positive().optional().nullable(),
    caloriesPerMinute: zod_1.z.number().nonnegative().optional().nullable(),
    phaseRecommendations: zod_1.z.array(phaseEnum).optional(),
    imageUrl: zod_1.z.string().url().optional().or(zod_1.z.literal("")).nullable(),
    videoUrl: zod_1.z.string().url().optional().or(zod_1.z.literal("")).nullable(),
    isActive: zod_1.z.boolean().optional(),
});
// ===========================================
// WORKOUT TEMPLATE SCHEMAS
// ===========================================
// Exercise config schema for template exercises - NOW REQUIRES exerciseId
const exerciseConfigSchema = zod_1.z.object({
    exerciseId: zod_1.z.string().min(1, "Exercise ID is required"), // REQUIRED - links to ExerciseLibrary
    exerciseName: zod_1.z.string().optional(), // Optional - will be populated from ExerciseLibrary
    sets: zod_1.z.number().int().positive().optional(),
    reps: zod_1.z.array(zod_1.z.number().int().positive()).optional(), // [10, 10, 8] - reps per set
    weight: zod_1.z.array(zod_1.z.number().nonnegative()).optional(), // [20, 20, 22.5] - weight per set (kg/lbs)
    duration: zod_1.z.number().int().positive().optional(), // seconds for time-based exercises
    restSeconds: zod_1.z.number().int().nonnegative().optional(),
    notes: zod_1.z.string().optional(),
    order: zod_1.z.number().int().nonnegative().optional(), // exercise order in workout
});
exports.workoutTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Template name is required"),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    difficulty: exerciseDifficultyEnum.optional(),
    estimatedDurationMinutes: zod_1.z.number().int().positive().optional(),
    isPublic: zod_1.z.boolean().optional().default(false),
    isSystemTemplate: zod_1.z.boolean().optional().default(false),
    exercises: zod_1.z.array(exerciseConfigSchema).min(1, "At least one exercise is required"),
});
exports.updateWorkoutTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional().nullable(),
    category: zod_1.z.string().optional().nullable(),
    difficulty: exerciseDifficultyEnum.optional().nullable(),
    estimatedDurationMinutes: zod_1.z.number().int().positive().optional().nullable(),
    isPublic: zod_1.z.boolean().optional(),
    exercises: zod_1.z.array(exerciseConfigSchema).optional(),
});
// ===========================================
// WORKOUT SESSION SCHEMAS
// ===========================================
// Exercise set schema for completed workouts
const exerciseSetSchema = zod_1.z.object({
    setNumber: zod_1.z.number().int().positive(),
    reps: zod_1.z.number().int().positive().optional(),
    weight: zod_1.z.number().nonnegative().optional(), // kg/lbs
    duration: zod_1.z.number().int().positive().optional(), // seconds
    completed: zod_1.z.boolean().optional().default(true),
    restSeconds: zod_1.z.number().int().nonnegative().optional(),
    notes: zod_1.z.string().optional(),
});
const sessionExerciseSchema = zod_1.z.object({
    exerciseId: zod_1.z.string().min(1, "Exercise ID is required"), // REQUIRED - links to ExerciseLibrary
    exerciseName: zod_1.z.string().optional(), // Optional - populated from ExerciseLibrary
    category: exerciseCategoryEnum.optional(),
    sets: zod_1.z.array(exerciseSetSchema),
    order: zod_1.z.number().int().nonnegative().optional(),
    notes: zod_1.z.string().optional(),
});
exports.workoutSessionSchema = zod_1.z.object({
    templateId: zod_1.z.string().optional(),
    templateName: zod_1.z.string().optional(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    startTime: zod_1.z.string().datetime().optional(),
    endTime: zod_1.z.string().datetime().optional(),
    durationMinutes: zod_1.z.number().int().positive().optional(),
    exercises: zod_1.z.array(sessionExerciseSchema).min(1, "At least one exercise is required"),
    totalVolume: zod_1.z.number().nonnegative().optional(),
    totalSets: zod_1.z.number().int().nonnegative().optional(),
    totalReps: zod_1.z.number().int().nonnegative().optional(),
    notes: zod_1.z.string().optional(),
    completed: zod_1.z.boolean().optional().default(true),
});
exports.updateWorkoutSessionSchema = zod_1.z.object({
    templateId: zod_1.z.string().optional().nullable(),
    templateName: zod_1.z.string().optional().nullable(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: zod_1.z.string().datetime().optional().nullable(),
    endTime: zod_1.z.string().datetime().optional().nullable(),
    durationMinutes: zod_1.z.number().int().positive().optional().nullable(),
    exercises: zod_1.z.array(sessionExerciseSchema).optional(),
    totalVolume: zod_1.z.number().nonnegative().optional().nullable(),
    totalSets: zod_1.z.number().int().nonnegative().optional().nullable(),
    totalReps: zod_1.z.number().int().nonnegative().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    completed: zod_1.z.boolean().optional(),
});
// ===========================================
// EXERCISE ENTRY SCHEMAS (Cardio/Yoga)
// ===========================================
// NOTE: ExerciseEntry is for SIMPLE cardio/yoga tracking (running, yoga, cycling)
// Different from WorkoutSession which tracks strength training with sets/reps/weight
// ExerciseEntry tracks: duration, distance, calories - simple metrics
exports.exerciseEntrySchema = zod_1.z.object({
    exerciseId: zod_1.z.string().min(1, "Exercise ID is required"), // REQUIRED - links to ExerciseLibrary
    exerciseName: zod_1.z.string().optional(), // Optional - auto-populated from ExerciseLibrary
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    durationMinutes: zod_1.z.number().int().positive().optional(),
    caloriesBurned: zod_1.z.number().int().nonnegative().optional(),
    distanceKm: zod_1.z.number().nonnegative().optional(), // For running/cycling
    notes: zod_1.z.string().optional(),
});
exports.updateExerciseEntrySchema = zod_1.z.object({
    exerciseId: zod_1.z.string().min(1).optional().nullable(), // Can update to different exercise
    exerciseName: zod_1.z.string().optional(), // Auto-populated if exerciseId provided
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    durationMinutes: zod_1.z.number().int().positive().optional().nullable(),
    caloriesBurned: zod_1.z.number().int().nonnegative().optional().nullable(),
    distanceKm: zod_1.z.number().nonnegative().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});

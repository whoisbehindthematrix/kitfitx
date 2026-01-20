import { Request, Response } from "express";
import { ExerciseCategory, ExerciseDifficulty, Prisma } from "@prisma/client";
import ErrorHandler from "@/utils/errorHandler";
import prisma from "../lib/prismaClient";
import {
  exerciseSchema,
  updateExerciseSchema,
  workoutTemplateSchema,
  updateWorkoutTemplateSchema,
  workoutSessionSchema,
  updateWorkoutSessionSchema,
  exerciseEntrySchema,
  updateExerciseEntrySchema,
} from "../validation/workoutSchemas.validation";
// Type imports for workout controllers
// These types are used in function return types and parameter types
import type {
  TemplateExerciseConfig,
  TemplateExerciseWithDetails,
  SessionExerciseInput,
  SessionExerciseWithDetails,
  ExerciseEntryResponse,
  ExerciseLibraryData,
} from "../types/workout.types";

// ===========================================
// EXERCISE LIBRARY CONTROLLERS
// ===========================================

// GET /api/workout/exercises - Get exercises
export const getExercises = async (req: Request, res: Response) => {
  const category = req.query.category as string;
  const difficulty = req.query.difficulty as string;
  const isActive = req.query.isActive !== "false"; // Default to true
  const search = req.query.search as string;
  const phase = req.query.phase as string; // menstrual, follicular, ovulatory, luteal
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const where: Prisma.ExerciseLibraryWhereInput = {
    isActive: isActive === true,
  };

  if (category && ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'yoga', 'pilates', 'dance'].includes(category)) {
    where.category = category as ExerciseCategory;
  }

  if (difficulty && ['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    where.difficulty = difficulty as ExerciseDifficulty;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filter by phase recommendations
  if (phase && ['menstrual', 'follicular', 'ovulatory', 'luteal'].includes(phase)) {
    where.phaseRecommendations = { has: phase };
  }

  const exercises = await prisma.exerciseLibrary.findMany({
    where,
    orderBy: { name: "asc" },
    take: limit,
    skip: offset,
  });

  res.status(200).json({
    success: true,
    data: exercises.map((exercise) => ({
      ...exercise,
      caloriesPerMinute: exercise.caloriesPerMinute?.toNumber() ?? null,
      createdAt: exercise.createdAt.toISOString(),
      updatedAt: exercise.updatedAt.toISOString(),
    })),
  });
};

// GET /api/workout/exercises/:id - Get single exercise
export const getExercise = async (req: Request, res: Response) => {
  const { id } = req.params;

  const exercise = await prisma.exerciseLibrary.findUnique({
    where: { id },
  });

  if (!exercise) {
    throw new ErrorHandler("Exercise not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      ...exercise,
      caloriesPerMinute: exercise.caloriesPerMinute?.toNumber() ?? null,
      createdAt: exercise.createdAt.toISOString(),
      updatedAt: exercise.updatedAt.toISOString(),
    },
  });
};

// GET /api/workout/exercises/recommended - Get recommended exercises based on cycle phase
export const getRecommendedExercises = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const phase = req.query.phase as string;
  if (!phase || !['menstrual', 'follicular', 'ovulatory', 'luteal'].includes(phase)) {
    throw new ErrorHandler("Valid phase is required (menstrual, follicular, ovulatory, luteal)", 400);
  }

  // Get user's current cycle phase
  const userPhase = phase;
  
  // TODO: Future enhancement - determine phase from prediction data if not provided
  // if (!phase) {
  //   const prediction = await prisma.predictionData.findFirst({
  //     where: { userId: user.sub },
  //     orderBy: { createdAt: 'desc' },
  //   });
  //   // Logic to determine phase based on predictions
  // }

  const exercises = await prisma.exerciseLibrary.findMany({
    where: {
      isActive: true,
      OR: [
        { phaseRecommendations: { has: userPhase } },
        { phaseRecommendations: { isEmpty: true } }, // Include exercises with no phase restrictions
      ],
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  res.status(200).json({
    success: true,
    data: exercises.map((exercise) => ({
      ...exercise,
      caloriesPerMinute: exercise.caloriesPerMinute?.toNumber() ?? null,
      createdAt: exercise.createdAt.toISOString(),
      updatedAt: exercise.updatedAt.toISOString(),
    })),
  });
};

// POST /api/workout/exercises - Create exercise (user-defined)
export const createExercise = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const parseResult = exerciseSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid exercise payload: " +
        parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const exercise = await prisma.exerciseLibrary.create({
    data: {
      ...parseResult.data,
      createdBy: user.sub,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      ...exercise,
      caloriesPerMinute: exercise.caloriesPerMinute?.toNumber() ?? null,
      createdAt: exercise.createdAt.toISOString(),
      updatedAt: exercise.updatedAt.toISOString(),
    },
    message: "Exercise created successfully",
  });
};

// PUT /api/workout/exercises/:id - Update exercise (user-defined only)
export const updateExercise = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const { id } = req.params;

  const parseResult = updateExerciseSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid exercise update payload: " +
        parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const existing = await prisma.exerciseLibrary.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ErrorHandler("Exercise not found", 404);
  }

  // Only allow updates to user-created exercises
  if (!existing.createdBy || existing.createdBy !== user.sub) {
    throw new ErrorHandler(
      "Unauthorized: You can only update your own exercises",
      403
    );
  }

  const updateData: Prisma.ExerciseLibraryUpdateInput = {};
  if (parseResult.data.name !== undefined) updateData.name = parseResult.data.name;
  if (parseResult.data.category !== undefined)
    updateData.category = parseResult.data.category;
  if (parseResult.data.description !== undefined)
    updateData.description = parseResult.data.description;
  if (parseResult.data.instructions !== undefined)
    updateData.instructions = parseResult.data.instructions;
  if (parseResult.data.primaryMuscles !== undefined)
    updateData.primaryMuscles = parseResult.data.primaryMuscles;
  if (parseResult.data.secondaryMuscles !== undefined)
    updateData.secondaryMuscles = parseResult.data.secondaryMuscles;
  if (parseResult.data.equipment !== undefined)
    updateData.equipment = parseResult.data.equipment;
  if (parseResult.data.difficulty !== undefined)
    updateData.difficulty = parseResult.data.difficulty as ExerciseDifficulty | null;
  if (parseResult.data.durationMinutes !== undefined)
    updateData.durationMinutes = parseResult.data.durationMinutes;
  if (parseResult.data.caloriesPerMinute !== undefined)
    updateData.caloriesPerMinute = parseResult.data.caloriesPerMinute ?? null;
  if (parseResult.data.phaseRecommendations !== undefined)
    updateData.phaseRecommendations = parseResult.data.phaseRecommendations;
  if (parseResult.data.imageUrl !== undefined)
    updateData.imageUrl = parseResult.data.imageUrl;
  if (parseResult.data.videoUrl !== undefined)
    updateData.videoUrl = parseResult.data.videoUrl;
  if (parseResult.data.isActive !== undefined)
    updateData.isActive = parseResult.data.isActive;

  const exercise = await prisma.exerciseLibrary.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({
    success: true,
    data: {
      ...exercise,
      caloriesPerMinute: exercise.caloriesPerMinute?.toNumber() ?? null,
      createdAt: exercise.createdAt.toISOString(),
      updatedAt: exercise.updatedAt.toISOString(),
    },
    message: "Exercise updated successfully",
  });
};

// DELETE /api/workout/exercises/:id - Soft delete exercise (user-defined only)
export const deleteExercise = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const { id } = req.params;

  const existing = await prisma.exerciseLibrary.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ErrorHandler("Exercise not found", 404);
  }

  // Only allow deletion of user-created exercises
  if (!existing.createdBy || existing.createdBy !== user.sub) {
    throw new ErrorHandler(
      "Unauthorized: You can only delete your own exercises",
      403
    );
  }

  await prisma.exerciseLibrary.update({
    where: { id },
    data: { isActive: false },
  });

  res.status(200).json({
    success: true,
    message: "Exercise deleted successfully",
  });
};

// ===========================================
// WORKOUT TEMPLATE CONTROLLERS
// ===========================================

// Helper function to populate exercises with ExerciseLibrary data
const populateExercisesWithLibraryData = async (
  exercises: TemplateExerciseConfig[]
): Promise<TemplateExerciseWithDetails[]> => {
  if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
    return [];
  }

  // Extract all exercise IDs
  const exerciseIds = exercises
    .map((ex) => ex.exerciseId)
    .filter((id) => id != null);

  if (exerciseIds.length === 0) {
    return exercises; // Return as-is if no exerciseIds
  }

  // Fetch all exercises from library in one query
  const exerciseLibrary = await prisma.exerciseLibrary.findMany({
    where: {
      id: { in: exerciseIds },
      isActive: true,
    },
  });

  // Create a map for quick lookup
  const exerciseMap = new Map<string, ExerciseLibraryData>(
    exerciseLibrary.map((ex) => [
      ex.id,
      {
        id: ex.id,
        name: ex.name,
        category: ex.category,
        description: ex.description,
        instructions: ex.instructions,
        primaryMuscles: ex.primaryMuscles,
        secondaryMuscles: ex.secondaryMuscles,
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        durationMinutes: ex.durationMinutes,
        caloriesPerMinute: ex.caloriesPerMinute?.toNumber() ?? null,
        phaseRecommendations: ex.phaseRecommendations,
        imageUrl: ex.imageUrl,
        videoUrl: ex.videoUrl,
      },
    ])
  );

  // Merge exercise config with library data
  return exercises.map((exerciseConfig) => {
    const exerciseData = exerciseMap.get(exerciseConfig.exerciseId);
    if (exerciseData) {
      return {
        ...exerciseConfig,
        exercise: exerciseData, // Full exercise data from library
        exerciseName: exerciseData.name, // Ensure exerciseName is set
      };
    }
    // If exercise not found, return config with warning
    return {
      ...exerciseConfig,
      exercise: null,
      exerciseName: exerciseConfig.exerciseName || "Exercise not found",
      _warning: "Exercise not found in library",
    };
  });
};

// Helper: populate session exercises (keeps sets/reps/etc, adds `exercise` details)
const populateSessionExercisesWithLibraryData = async (
  exercises: SessionExerciseInput[]
): Promise<SessionExerciseWithDetails[]> => {
  if (!exercises || !Array.isArray(exercises) || exercises.length === 0) return [];

  const exerciseIds = exercises
    .map((ex) => ex.exerciseId)
    .filter((id) => id != null);

  if (exerciseIds.length === 0) return exercises;

  const exerciseLibrary = await prisma.exerciseLibrary.findMany({
    where: {
      id: { in: exerciseIds },
      isActive: true,
    },
  });

  const exerciseMap = new Map<string, ExerciseLibraryData>(
    exerciseLibrary.map((ex) => [
      ex.id,
      {
        id: ex.id,
        name: ex.name,
        category: ex.category,
        description: ex.description,
        instructions: ex.instructions,
        primaryMuscles: ex.primaryMuscles,
        secondaryMuscles: ex.secondaryMuscles,
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        durationMinutes: ex.durationMinutes,
        caloriesPerMinute: ex.caloriesPerMinute?.toNumber() ?? null,
        phaseRecommendations: ex.phaseRecommendations,
        imageUrl: ex.imageUrl,
        videoUrl: ex.videoUrl,
      },
    ])
  );

  return exercises.map((ex) => {
    const libraryExercise = exerciseMap.get(ex.exerciseId);
    if (!libraryExercise) {
      return {
        ...ex,
        exercise: null,
        exerciseName: ex.exerciseName || "Exercise not found",
        _warning: "Exercise not found in library",
      };
    }
    return {
      ...ex,
      exerciseName: libraryExercise.name,
      category: ex.category ?? libraryExercise.category,
      exercise: libraryExercise,
    };
  });
};

// Helper: validate a templateId is accessible to current user
const validateTemplateAccess = async (templateId: string, userId: string) => {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new ErrorHandler("Template not found", 404);
  }

  const isOwner = template.userId === userId;
  const isPublicSystem = template.isSystemTemplate && template.isPublic;

  if (!isOwner && !isPublicSystem) {
    throw new ErrorHandler("Unauthorized: Template not accessible", 403);
  }

  return template;
};

// Helper: validate exerciseIds exist; enrich with name/category from library
const validateAndEnrichSessionExercises = async (
  exercises: SessionExerciseInput[]
): Promise<SessionExerciseInput[]> => {
  const exerciseIds = exercises.map((e) => e.exerciseId);

  const existingExercises = await prisma.exerciseLibrary.findMany({
    where: {
      id: { in: exerciseIds },
      isActive: true,
    },
    select: { id: true, name: true, category: true },
  });

  const existingIds = new Set(existingExercises.map((e) => e.id));
  const missingIds = exerciseIds.filter((id) => !existingIds.has(id));
  if (missingIds.length > 0) {
    throw new ErrorHandler(
      `Exercises not found or inactive: ${missingIds.join(", ")}`,
      404
    );
  }

  const exMap = new Map(existingExercises.map((e) => [e.id, e]));

  return exercises.map((e) => {
    const lib = exMap.get(e.exerciseId)!;
    return {
      ...e,
      exerciseName: lib.name,
      category: e.category ?? lib.category,
    };
  });
};

// GET /api/workout/templates - Get workout templates
export const getTemplates = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const includeSystem = req.query.includeSystem === "true";
  const category = req.query.category as string;
  const difficulty = req.query.difficulty as string;

  const where: Prisma.WorkoutTemplateWhereInput = {
    OR: [
      { userId }, // User's templates
      ...(includeSystem ? [{ isSystemTemplate: true, isPublic: true }] : []), // System templates
    ],
  };

  if (category) {
    where.category = category;
  }

  if (difficulty && ['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    where.difficulty = difficulty as ExerciseDifficulty;
  }

  const templates = await prisma.workoutTemplate.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Process all templates and populate exercises
  const templatesWithPopulatedExercises = await Promise.all(
    templates.map(async (template) => {
      const exercises = typeof template.exercises === 'string' 
        ? JSON.parse(template.exercises) 
        : template.exercises;
      
      const populatedExercises = await populateExercisesWithLibraryData(exercises);

      return {
        ...template,
        exercises: populatedExercises,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      };
    })
  );

  res.status(200).json({
    success: true,
    data: templatesWithPopulatedExercises,
  });
};

// POST /api/workout/templates - Create workout template
export const createTemplate = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  const parseResult = workoutTemplateSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid template payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  // Validate all exerciseIds exist in ExerciseLibrary
  const exerciseIds = parseResult.data.exercises.map((ex) => ex.exerciseId);
  const existingExercises = await prisma.exerciseLibrary.findMany({
    where: {
      id: { in: exerciseIds },
      isActive: true,
    },
    select: { id: true, name: true },
  });

  const existingIds = new Set(existingExercises.map((ex) => ex.id));
  const missingIds = exerciseIds.filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    throw new ErrorHandler(
      `Exercises not found or inactive: ${missingIds.join(", ")}`,
      404
    );
  }

  // Enrich exercises with exercise names from library
  const exerciseNameMap = new Map(
    existingExercises.map((ex) => [ex.id, ex.name])
  );

  const enrichedExercises = parseResult.data.exercises.map((ex) => ({
    ...ex,
    exerciseName: exerciseNameMap.get(ex.exerciseId) || ex.exerciseName,
  }));

  const template = await prisma.workoutTemplate.create({
    data: {
      userId,
      name: parseResult.data.name,
      description: parseResult.data.description,
      category: parseResult.data.category,
      difficulty: parseResult.data.difficulty,
      estimatedDurationMinutes: parseResult.data.estimatedDurationMinutes,
      isPublic: parseResult.data.isPublic,
      exercises: enrichedExercises as unknown as Prisma.InputJsonValue,
      isSystemTemplate: false, // Users can't create system templates
    },
  });

  // Populate exercises with full library data for response
  const exercises = typeof template.exercises === 'string' 
    ? JSON.parse(template.exercises) 
    : template.exercises;
  const populatedExercises = await populateExercisesWithLibraryData(exercises);

  res.status(201).json({
    success: true,
    data: {
      ...template,
      exercises: populatedExercises,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    },
    message: "Workout template created successfully",
  });
};

// PUT /api/workout/templates/:id - Update workout template
export const updateTemplate = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const { id } = req.params;

  const parseResult = updateWorkoutTemplateSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  // Verify ownership
  const existingTemplate = await prisma.workoutTemplate.findUnique({
    where: { id },
  });

  if (!existingTemplate) {
    throw new ErrorHandler("Template not found", 404);
  }

  if (existingTemplate.userId !== userId && !existingTemplate.isSystemTemplate) {
    throw new ErrorHandler("Unauthorized: You can only update your own templates", 403);
  }

  // Validate exerciseIds if exercises are being updated
  if (parseResult.data.exercises) {
    const exerciseIds = parseResult.data.exercises.map((ex) => ex.exerciseId);
    const existingExercises = await prisma.exerciseLibrary.findMany({
      where: {
        id: { in: exerciseIds },
        isActive: true,
      },
      select: { id: true, name: true },
    });

    const existingIds = new Set(existingExercises.map((ex) => ex.id));
    const missingIds = exerciseIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new ErrorHandler(
        `Exercises not found or inactive: ${missingIds.join(", ")}`,
        404
      );
    }

    // Enrich exercises with exercise names from library
    const exerciseNameMap = new Map(
      existingExercises.map((ex) => [ex.id, ex.name])
    );

    parseResult.data.exercises = parseResult.data.exercises.map((ex) => ({
      ...ex,
      exerciseName: exerciseNameMap.get(ex.exerciseId) || ex.exerciseName,
    }));
  }

  const updateData: Prisma.WorkoutTemplateUpdateInput = {};
  if (parseResult.data.name !== undefined) updateData.name = parseResult.data.name;
  if (parseResult.data.description !== undefined) updateData.description = parseResult.data.description;
  if (parseResult.data.category !== undefined) updateData.category = parseResult.data.category;
  if (parseResult.data.difficulty !== undefined) updateData.difficulty = parseResult.data.difficulty;
  if (parseResult.data.estimatedDurationMinutes !== undefined) updateData.estimatedDurationMinutes = parseResult.data.estimatedDurationMinutes;
  if (parseResult.data.isPublic !== undefined) updateData.isPublic = parseResult.data.isPublic;
  if (parseResult.data.exercises !== undefined) {
    updateData.exercises = parseResult.data.exercises as unknown as Prisma.InputJsonValue;
  }

  const template = await prisma.workoutTemplate.update({
    where: { id },
    data: updateData,
  });

  // Populate exercises with full library data for response
  const exercises = typeof template.exercises === 'string' 
    ? JSON.parse(template.exercises) 
    : template.exercises;
  const populatedExercises = await populateExercisesWithLibraryData(exercises);

  res.status(200).json({
    success: true,
    data: {
      ...template,
      exercises: populatedExercises,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    },
    message: "Workout template updated successfully",
  });
};

// DELETE /api/workout/templates/:id - Delete workout template
export const deleteTemplate = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const { id } = req.params;

  // Verify ownership
  const existingTemplate = await prisma.workoutTemplate.findUnique({
    where: { id },
  });

  if (!existingTemplate) {
    throw new ErrorHandler("Template not found", 404);
  }

  if (existingTemplate.userId !== userId) {
    throw new ErrorHandler("Unauthorized: You can only delete your own templates", 403);
  }

  if (existingTemplate.isSystemTemplate) {
    throw new ErrorHandler("Cannot delete system templates", 403);
  }

  await prisma.workoutTemplate.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: "Workout template deleted successfully",
  });
};

// ===========================================
// WORKOUT SESSION CONTROLLERS
// ===========================================

// GET /api/workout/sessions - Get workout sessions
export const getSessions = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const date = req.query.date as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const completed = req.query.completed as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const where: Prisma.WorkoutSessionWhereInput = { userId };

  if (date) {
    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);
    where.date = sessionDate;
  } else if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.date.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  if (completed === "true" || completed === "false") {
    where.completed = completed === "true";
  }

  const sessions = await prisma.workoutSession.findMany({
    where,
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
  });

  const sessionsWithPopulatedExercises = await Promise.all(
    sessions.map(async (session) => {
      const exercises =
        typeof session.exercises === "string"
          ? JSON.parse(session.exercises)
          : session.exercises;

      const populatedExercises =
        await populateSessionExercisesWithLibraryData(exercises);

      return {
        ...session,
        date: session.date.toISOString().split("T")[0],
        exercises: populatedExercises,
        totalVolume: session.totalVolume.toNumber(),
        startTime: session.startTime?.toISOString() ?? null,
        endTime: session.endTime?.toISOString() ?? null,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      };
    })
  );

  res.status(200).json({
    success: true,
    data: sessionsWithPopulatedExercises,
  });
};

// GET /api/workout/sessions/:id - Get single workout session
export const getSession = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const { id } = req.params;

  const session = await prisma.workoutSession.findUnique({
    where: { id },
  });

  if (!session) {
    throw new ErrorHandler("Workout session not found", 404);
  }

  if (session.userId !== userId) {
    throw new ErrorHandler("Unauthorized", 403);
  }

  const exercises =
    typeof session.exercises === "string"
      ? JSON.parse(session.exercises)
      : session.exercises;
  const populatedExercises = await populateSessionExercisesWithLibraryData(
    exercises
  );

  res.status(200).json({
    success: true,
    data: {
      ...session,
      date: session.date.toISOString().split("T")[0],
      exercises: populatedExercises,
      totalVolume: session.totalVolume.toNumber(),
      startTime: session.startTime?.toISOString() ?? null,
      endTime: session.endTime?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
  });
};

// POST /api/workout/sessions - Create workout session
export const createSession = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  const parseResult = workoutSessionSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid session payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  // Validate template access (if provided) and fill templateName (if missing)
  let templateName: string | null = parseResult.data.templateName || null;
  const templateId: string | null = parseResult.data.templateId || null;
  if (templateId) {
    const template = await validateTemplateAccess(templateId, userId);
    templateName = templateName || template.name;
  }

  // Validate and enrich session exercises (requires exerciseId)
  const enrichedExercises = await validateAndEnrichSessionExercises(
    parseResult.data.exercises as SessionExerciseInput[]
  );

  // Calculate total volume, sets, and reps
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;

  enrichedExercises.forEach((exercise) => {
    const sets = exercise.sets || [];
    totalSets += sets.length;
    sets.forEach((set) => {
      if (set.reps && set.weight) {
        totalVolume += set.reps * set.weight;
        totalReps += set.reps;
      } else if (set.reps) {
        totalReps += set.reps;
      }
    });
  });

  const sessionDate = new Date(parseResult.data.date);
  sessionDate.setHours(0, 0, 0, 0);

  const session = await prisma.workoutSession.create({
    data: {
      userId,
      templateId,
      templateName,
      date: sessionDate,
      startTime: parseResult.data.startTime ? new Date(parseResult.data.startTime) : null,
      endTime: parseResult.data.endTime ? new Date(parseResult.data.endTime) : null,
      durationMinutes: parseResult.data.durationMinutes || null,
      exercises: enrichedExercises as unknown as Prisma.InputJsonValue,
      totalVolume: parseResult.data.totalVolume ?? totalVolume,
      totalSets: parseResult.data.totalSets ?? totalSets,
      totalReps: parseResult.data.totalReps ?? totalReps,
      notes: parseResult.data.notes || null,
      completed: parseResult.data.completed ?? true,
    },
  });

  const populatedExercises = await populateSessionExercisesWithLibraryData(
    typeof session.exercises === "string"
      ? JSON.parse(session.exercises)
      : session.exercises
  );

  res.status(201).json({
    success: true,
    data: {
      ...session,
      date: session.date.toISOString().split("T")[0],
      exercises: populatedExercises,
      totalVolume: session.totalVolume.toNumber(),
      startTime: session.startTime?.toISOString() ?? null,
      endTime: session.endTime?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
    message: "Workout session created successfully",
  });
};

// PUT /api/workout/sessions/:id - Update workout session
export const updateSession = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const { id } = req.params;

  const parseResult = updateWorkoutSessionSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  // Verify ownership
  const existingSession = await prisma.workoutSession.findUnique({
    where: { id },
  });

  if (!existingSession || existingSession.userId !== userId) {
    throw new ErrorHandler("Workout session not found", 404);
  }

  // Validate template access if templateId is being changed
  if (parseResult.data.templateId !== undefined) {
    const newTemplateId = parseResult.data.templateId;
    if (newTemplateId) {
      const template = await validateTemplateAccess(newTemplateId, userId);
      // If caller didn't provide templateName, set it from template
      if (parseResult.data.templateName === undefined) {
        parseResult.data.templateName = template.name;
      }
    } else {
      // templateId explicitly set to null
      if (parseResult.data.templateName === undefined) {
        parseResult.data.templateName = null;
      }
    }
  }

  // Validate/enrich exercises if updated
  if (parseResult.data.exercises) {
    const enrichedExercises = await validateAndEnrichSessionExercises(
      parseResult.data.exercises as SessionExerciseInput[]
    );
    parseResult.data.exercises = enrichedExercises as typeof parseResult.data.exercises;
  }

  // Recalculate totals if exercises are updated
  let totalVolume = existingSession.totalVolume.toNumber();
  let totalSets = existingSession.totalSets;
  let totalReps = existingSession.totalReps;

  if (parseResult.data.exercises) {
    totalVolume = 0;
    totalSets = 0;
    totalReps = 0;
    parseResult.data.exercises.forEach((exercise) => {
      const sets = exercise.sets || [];
      totalSets += sets.length;
      sets.forEach((set) => {
        if (set.reps && set.weight) {
          totalVolume += set.reps * set.weight;
          totalReps += set.reps;
        } else if (set.reps) {
          totalReps += set.reps;
        }
      });
    });
  }

  const updateData: Prisma.WorkoutSessionUpdateInput = {};
  if (parseResult.data.templateId !== undefined) {
    updateData.template = parseResult.data.templateId 
      ? { connect: { id: parseResult.data.templateId } }
      : { disconnect: true };
  }
  if (parseResult.data.templateName !== undefined) updateData.templateName = parseResult.data.templateName;
  if (parseResult.data.date) {
    const sessionDate = new Date(parseResult.data.date);
    sessionDate.setHours(0, 0, 0, 0);
    updateData.date = sessionDate;
  }
  if (parseResult.data.startTime !== undefined) updateData.startTime = parseResult.data.startTime ? new Date(parseResult.data.startTime) : null;
  if (parseResult.data.endTime !== undefined) updateData.endTime = parseResult.data.endTime ? new Date(parseResult.data.endTime) : null;
  if (parseResult.data.durationMinutes !== undefined) updateData.durationMinutes = parseResult.data.durationMinutes;
  if (parseResult.data.exercises !== undefined) {
    updateData.exercises = parseResult.data.exercises as unknown as Prisma.InputJsonValue;
  }
  if (parseResult.data.totalVolume !== undefined) {
    updateData.totalVolume = parseResult.data.totalVolume !== null ? parseResult.data.totalVolume : undefined;
  }
  if (parseResult.data.totalSets !== undefined) {
    updateData.totalSets = parseResult.data.totalSets !== null ? parseResult.data.totalSets : undefined;
  }
  if (parseResult.data.totalReps !== undefined) {
    updateData.totalReps = parseResult.data.totalReps !== null ? parseResult.data.totalReps : undefined;
  }
  if (parseResult.data.notes !== undefined) updateData.notes = parseResult.data.notes;
  if (parseResult.data.completed !== undefined) updateData.completed = parseResult.data.completed;

  // Override with calculated values if exercises were updated
  if (parseResult.data.exercises) {
    updateData.totalVolume = totalVolume;
    updateData.totalSets = totalSets;
    updateData.totalReps = totalReps;
  }

  const session = await prisma.workoutSession.update({
    where: { id },
    data: updateData,
  });

  const populatedExercises = await populateSessionExercisesWithLibraryData(
    typeof session.exercises === "string"
      ? JSON.parse(session.exercises)
      : session.exercises
  );

  res.status(200).json({
    success: true,
    data: {
      ...session,
      date: session.date.toISOString().split("T")[0],
      exercises: populatedExercises,
      totalVolume: session.totalVolume.toNumber(),
      startTime: session.startTime?.toISOString() ?? null,
      endTime: session.endTime?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
    message: "Workout session updated successfully",
  });
};

// DELETE /api/workout/sessions/:id - Delete workout session
export const deleteSession = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const { id } = req.params;

  // Verify ownership
  const existingSession = await prisma.workoutSession.findUnique({
    where: { id },
  });

  if (!existingSession || existingSession.userId !== userId) {
    throw new ErrorHandler("Workout session not found", 404);
  }

  await prisma.workoutSession.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: "Workout session deleted successfully",
  });
};

// ===========================================
// EXERCISE ENTRY CONTROLLERS (Cardio/Yoga)
// ===========================================
// NOTE: These routes are for SIMPLE cardio/yoga activity tracking
// Use cases: Running, Yoga, Cycling, Walking, Swimming
// Tracks: duration, distance, calories (NOT sets/reps/weight like WorkoutSession)
// Different from WorkoutSession which is for strength training

// Helper: Populate exercise entry with ExerciseLibrary data
const populateExerciseEntryWithLibraryData = async (
  entry: ExerciseEntryResponse
): Promise<ExerciseEntryResponse> => {
  if (!entry.exerciseId) {
    return {
      ...entry,
      exercise: null,
      _warning: "Exercise ID missing",
    };
  }

  const exercise = await prisma.exerciseLibrary.findUnique({
    where: { id: entry.exerciseId },
  });

  if (!exercise) {
    return {
      ...entry,
      exercise: null,
      _warning: "Exercise not found in library",
    };
  }

  return {
    ...entry,
    exercise: {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      description: exercise.description,
      instructions: exercise.instructions,
      primaryMuscles: exercise.primaryMuscles,
      secondaryMuscles: exercise.secondaryMuscles,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      durationMinutes: exercise.durationMinutes,
      caloriesPerMinute: exercise.caloriesPerMinute?.toNumber() ?? null,
      phaseRecommendations: exercise.phaseRecommendations,
      imageUrl: exercise.imageUrl,
      videoUrl: exercise.videoUrl,
    },
  };
};

// GET /api/workout/exercises/entries - Get exercise entries (cardio/yoga activities)
export const getExerciseEntries = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const date = req.query.date as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const exerciseId = req.query.exerciseId as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const where: Prisma.ExerciseEntryWhereInput = { userId };

  if (date) {
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);
    where.date = entryDate;
  } else if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.date.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  if (exerciseId) {
    where.exerciseId = exerciseId;
  }

  const entries = await prisma.exerciseEntry.findMany({
    where,
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
  });

  // Populate each entry with exercise data from ExerciseLibrary
  const populatedEntries = await Promise.all(
    entries.map(async (entry) => {
      const baseEntry = {
        ...entry,
        date: entry.date.toISOString().split('T')[0],
        distanceKm: entry.distanceKm?.toNumber() ?? null,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      };
      return await populateExerciseEntryWithLibraryData(baseEntry);
    })
  );

  res.status(200).json({
    success: true,
    data: populatedEntries,
  });
};

// POST /api/workout/exercises/entries - Create exercise entry (cardio/yoga activity)
export const createExerciseEntry = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  const parseResult = exerciseEntrySchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid exercise entry payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  // Validate exerciseId exists and is active (REQUIRED now)
  const exercise = await prisma.exerciseLibrary.findUnique({
    where: { id: parseResult.data.exerciseId, isActive: true },
  });

  if (!exercise) {
    throw new ErrorHandler("Exercise not found or inactive", 404);
  }

  // Auto-populate exerciseName from ExerciseLibrary
  const exerciseName = parseResult.data.exerciseName || exercise.name;

  const entryDate = new Date(parseResult.data.date);
  entryDate.setHours(0, 0, 0, 0);

  const entry = await prisma.exerciseEntry.create({
    data: {
      userId,
      exerciseId: parseResult.data.exerciseId, // Required - linked to ExerciseLibrary
      exerciseName, // Auto-populated from ExerciseLibrary
      date: entryDate,
      durationMinutes: parseResult.data.durationMinutes || null,
      caloriesBurned: parseResult.data.caloriesBurned || null,
      distanceKm: parseResult.data.distanceKm || null,
      notes: parseResult.data.notes || null,
    },
  });

  // Populate with full exercise data for response
  const baseEntry = {
    ...entry,
    date: entry.date.toISOString().split('T')[0],
    distanceKm: entry.distanceKm?.toNumber() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
  const populatedEntry = await populateExerciseEntryWithLibraryData(baseEntry);

  res.status(201).json({
    success: true,
    data: populatedEntry,
    message: "Exercise entry created successfully",
  });
};

// PUT /api/workout/exercises/entries/:id - Update exercise entry
export const updateExerciseEntry = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const { id } = req.params;

  const parseResult = updateExerciseEntrySchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  // Verify ownership
  const existingEntry = await prisma.exerciseEntry.findUnique({
    where: { id },
  });

  if (!existingEntry || existingEntry.userId !== userId) {
    throw new ErrorHandler("Exercise entry not found", 404);
  }

  // Validate exerciseId if being updated
  let exerciseName = parseResult.data.exerciseName;
  if (parseResult.data.exerciseId !== undefined && parseResult.data.exerciseId !== null) {
    const exercise = await prisma.exerciseLibrary.findUnique({
      where: { id: parseResult.data.exerciseId, isActive: true },
    });
    if (!exercise) {
      throw new ErrorHandler("Exercise not found or inactive", 404);
    }
    // Auto-populate exerciseName if not provided
    exerciseName = exerciseName || exercise.name;
  }

  const updateData: Prisma.ExerciseEntryUpdateInput = {};
  if (parseResult.data.exerciseId !== undefined) {
    updateData.exercise = parseResult.data.exerciseId 
      ? { connect: { id: parseResult.data.exerciseId } }
      : { disconnect: true };
  }
  if (exerciseName !== undefined) updateData.exerciseName = exerciseName;
  if (parseResult.data.date) {
    const entryDate = new Date(parseResult.data.date);
    entryDate.setHours(0, 0, 0, 0);
    updateData.date = entryDate;
  }
  if (parseResult.data.durationMinutes !== undefined) updateData.durationMinutes = parseResult.data.durationMinutes;
  if (parseResult.data.caloriesBurned !== undefined) updateData.caloriesBurned = parseResult.data.caloriesBurned;
  if (parseResult.data.distanceKm !== undefined) updateData.distanceKm = parseResult.data.distanceKm;
  if (parseResult.data.notes !== undefined) updateData.notes = parseResult.data.notes;

  const entry = await prisma.exerciseEntry.update({
    where: { id },
    data: updateData,
  });

  // Populate with full exercise data for response
  const baseEntry = {
    ...entry,
    date: entry.date.toISOString().split('T')[0],
    distanceKm: entry.distanceKm?.toNumber() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
  const populatedEntry = await populateExerciseEntryWithLibraryData(baseEntry);

  res.status(200).json({
    success: true,
    data: populatedEntry,
    message: "Exercise entry updated successfully",
  });
};

// DELETE /api/workout/exercises/entries/:id - Delete exercise entry
export const deleteExerciseEntry = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const { id } = req.params;

  // Verify ownership
  const existingEntry = await prisma.exerciseEntry.findUnique({
    where: { id },
  });

  if (!existingEntry || existingEntry.userId !== userId) {
    throw new ErrorHandler("Exercise entry not found", 404);
  }

  await prisma.exerciseEntry.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: "Exercise entry deleted successfully",
  });
};

// ===========================================
// ANALYTICS CONTROLLERS
// ===========================================

// GET /api/workout/analytics - Get workout analytics
export const getAnalytics = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  // Default to last 30 days if no dates provided
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  const start = startDate ? new Date(startDate) : new Date();
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);

  // Get workout sessions
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
      completed: true,
    },
  });

  // Get exercise entries
  const entries = await prisma.exerciseEntry.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    },
  });

  // Calculate analytics
  const totalWorkouts = sessions.length;
  const totalVolume = sessions.reduce((sum, s) => sum + s.totalVolume.toNumber(), 0);
  const totalSets = sessions.reduce((sum, s) => sum + s.totalSets, 0);
  const totalReps = sessions.reduce((sum, s) => sum + s.totalReps, 0);
  const totalDuration = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  
  // Cardio/yoga analytics
  const totalCardioDuration = entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
  const totalCaloriesBurned = entries.reduce((sum, e) => sum + (e.caloriesBurned || 0), 0);
  const totalDistance = entries.reduce((sum, e) => sum + (e.distanceKm?.toNumber() || 0), 0);
  const totalCardioSessions = entries.length;

  // Workout frequency (days per week)
  const workoutDays = new Set(sessions.map(s => s.date.toISOString().split('T')[0]));
  const uniqueWorkoutDays = workoutDays.size;
  const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const workoutsPerWeek = daysInPeriod > 0 ? (uniqueWorkoutDays / daysInPeriod) * 7 : 0;

  // Average volume per workout
  const avgVolumePerWorkout = totalWorkouts > 0 ? totalVolume / totalWorkouts : 0;

  // Volume progression (compare first half vs second half of period)
  const sortedSessions = sessions.sort((a, b) => a.date.getTime() - b.date.getTime());
  const midpoint = Math.floor(sortedSessions.length / 2);
  const firstHalfVolume = sortedSessions.slice(0, midpoint).reduce((sum, s) => sum + s.totalVolume.toNumber(), 0);
  const secondHalfVolume = sortedSessions.slice(midpoint).reduce((sum, s) => sum + s.totalVolume.toNumber(), 0);
  const volumeProgression = firstHalfVolume > 0 ? ((secondHalfVolume - firstHalfVolume) / firstHalfVolume) * 100 : 0;

  res.status(200).json({
    success: true,
    data: {
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        days: daysInPeriod,
      },
      strengthTraining: {
        totalWorkouts,
        totalVolume: Math.round(totalVolume * 100) / 100,
        totalSets,
        totalReps,
        totalDurationMinutes: totalDuration,
        avgVolumePerWorkout: Math.round(avgVolumePerWorkout * 100) / 100,
        workoutsPerWeek: Math.round(workoutsPerWeek * 10) / 10,
        volumeProgression: Math.round(volumeProgression * 10) / 10, // percentage
      },
      cardio: {
        totalSessions: totalCardioSessions,
        totalDurationMinutes: totalCardioDuration,
        totalCaloriesBurned,
        totalDistanceKm: Math.round(totalDistance * 100) / 100,
        avgDurationPerSession: totalCardioSessions > 0 ? Math.round(totalCardioDuration / totalCardioSessions) : 0,
      },
      overall: {
        totalWorkoutDays: uniqueWorkoutDays,
        totalActiveDays: uniqueWorkoutDays + new Set(entries.map(e => e.date.toISOString().split('T')[0])).size,
      },
    },
  });
};

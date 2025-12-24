import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prismaClient";
import {
  onboardingSchema,
  updateOnboardingSchema,
  onboardingQuestionsSchema,
  updateOnboardingQuestionsSchema,
} from "../validation/onboardingSchemas.validation";
import ErrorHandler from "@/utils/errorHandler";

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function cleanData(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    cleaned[key] = value;
  }
  
  return cleaned;
}

// ===========================================
// ONBOARDING CONTROLLERS (Basic Profile)
// ===========================================

// POST /api/onboarding - Save onboarding data
export const saveOnboarding = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  // Parse and validate
  const parseResult = onboardingSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid onboarding payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const onboardingData = parseResult.data;

  // Ensure user exists
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    throw new ErrorHandler("User not found", 404);
  }

  // Clean and prepare data
  const cleanedData = cleanData(onboardingData);

  // Prepare database data
  const dbData: Record<string, unknown> = {
    userId,
    averageCycleLength: cleanedData.averageCycleLength || 28,
    periodDuration: cleanedData.periodDuration || 5,
  };

  // Add optional fields
  if (cleanedData.dateOfBirth) {
    dbData.dateOfBirth = new Date(cleanedData.dateOfBirth as string);
  }
  if (cleanedData.weight !== undefined) dbData.weight = cleanedData.weight;
  if (cleanedData.height !== undefined) dbData.height = cleanedData.height;
  if (cleanedData.targetWeight !== undefined) dbData.targetWeight = cleanedData.targetWeight;
  if (cleanedData.unitsSystem) dbData.unitsSystem = cleanedData.unitsSystem;
  if (cleanedData.dailyCalorieGoal !== undefined) dbData.dailyCalorieGoal = cleanedData.dailyCalorieGoal;

  // Upsert onboarding data
  const onboarding = await prisma.onboarding.upsert({
    where: { userId },
    update: dbData as Prisma.OnboardingUpdateInput,
    create: dbData as Prisma.OnboardingCreateInput,
  });

  // Format response
  const responseData: Record<string, unknown> = {
    id: onboarding.id,
    userId: onboarding.userId,
    averageCycleLength: onboarding.averageCycleLength,
    periodDuration: onboarding.periodDuration,
    isCompleted: onboarding.isCompleted,
    createdAt: onboarding.createdAt.toISOString(),
    updatedAt: onboarding.updatedAt.toISOString(),
  };

  if (onboarding.dateOfBirth) {
    responseData.dateOfBirth = onboarding.dateOfBirth.toISOString().split('T')[0];
  }
  if (onboarding.weight !== null) responseData.weight = onboarding.weight;
  if (onboarding.height !== null) responseData.height = onboarding.height;
  if (onboarding.targetWeight !== null) responseData.targetWeight = onboarding.targetWeight;
  if (onboarding.unitsSystem) responseData.unitsSystem = onboarding.unitsSystem;
  if (onboarding.dailyCalorieGoal !== null) responseData.dailyCalorieGoal = onboarding.dailyCalorieGoal;
  if (onboarding.completedAt) responseData.completedAt = onboarding.completedAt.toISOString();

  res.status(201).json({
    success: true,
    data: responseData,
    message: "Onboarding data saved successfully",
  });
};

// GET /api/onboarding - Retrieve onboarding data
export const getOnboarding = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  const onboarding = await prisma.onboarding.findUnique({
    where: { userId },
  });

  if (!onboarding) {
    return res.status(200).json({
      success: true,
      data: null,
    });
  }

  // Format response
  const responseData: Record<string, unknown> = {
    id: onboarding.id,
    userId: onboarding.userId,
    averageCycleLength: onboarding.averageCycleLength,
    periodDuration: onboarding.periodDuration,
    isCompleted: onboarding.isCompleted,
    createdAt: onboarding.createdAt.toISOString(),
    updatedAt: onboarding.updatedAt.toISOString(),
  };

  if (onboarding.dateOfBirth) {
    responseData.dateOfBirth = onboarding.dateOfBirth.toISOString().split('T')[0];
  }
  if (onboarding.weight !== null) responseData.weight = onboarding.weight;
  if (onboarding.height !== null) responseData.height = onboarding.height;
  if (onboarding.targetWeight !== null) responseData.targetWeight = onboarding.targetWeight;
  if (onboarding.unitsSystem) responseData.unitsSystem = onboarding.unitsSystem;
  if (onboarding.dailyCalorieGoal !== null) responseData.dailyCalorieGoal = onboarding.dailyCalorieGoal;
  if (onboarding.completedAt) responseData.completedAt = onboarding.completedAt.toISOString();

  res.status(200).json({
    success: true,
    data: responseData,
  });
};

// PATCH /api/onboarding - Update onboarding data
export const updateOnboarding = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  // Parse and validate
  const parseResult = updateOnboardingSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const updateData = parseResult.data;

  // Check if onboarding data exists
  const existingOnboarding = await prisma.onboarding.findUnique({
    where: { userId },
  });

  if (!existingOnboarding) {
    throw new ErrorHandler("Onboarding data not found. Please save onboarding data first.", 404);
  }

  // Clean data
  const cleanedData = cleanData(updateData);

  // Prepare update data
  const dbUpdateData: Record<string, unknown> = {};

  if (cleanedData.dateOfBirth) {
    dbUpdateData.dateOfBirth = new Date(cleanedData.dateOfBirth as string);
  }
  if (cleanedData.weight !== undefined) dbUpdateData.weight = cleanedData.weight;
  if (cleanedData.height !== undefined) dbUpdateData.height = cleanedData.height;
  if (cleanedData.targetWeight !== undefined) dbUpdateData.targetWeight = cleanedData.targetWeight;
  if (cleanedData.unitsSystem) dbUpdateData.unitsSystem = cleanedData.unitsSystem;
  if (cleanedData.dailyCalorieGoal !== undefined) dbUpdateData.dailyCalorieGoal = cleanedData.dailyCalorieGoal;
  if (cleanedData.averageCycleLength !== undefined) dbUpdateData.averageCycleLength = cleanedData.averageCycleLength;
  if (cleanedData.periodDuration !== undefined) dbUpdateData.periodDuration = cleanedData.periodDuration;

  if (Object.keys(dbUpdateData).length === 0) {
    return res.status(200).json({
      success: true,
      data: existingOnboarding,
    });
  }

  // Update onboarding data
  const updatedOnboarding = await prisma.onboarding.update({
    where: { userId },
    data: dbUpdateData as Prisma.OnboardingUpdateInput,
  });

  // Format response
  const responseData: Record<string, unknown> = {
    id: updatedOnboarding.id,
    userId: updatedOnboarding.userId,
    averageCycleLength: updatedOnboarding.averageCycleLength,
    periodDuration: updatedOnboarding.periodDuration,
    isCompleted: updatedOnboarding.isCompleted,
    createdAt: updatedOnboarding.createdAt.toISOString(),
    updatedAt: updatedOnboarding.updatedAt.toISOString(),
  };

  if (updatedOnboarding.dateOfBirth) {
    responseData.dateOfBirth = updatedOnboarding.dateOfBirth.toISOString().split('T')[0];
  }
  if (updatedOnboarding.weight !== null) responseData.weight = updatedOnboarding.weight;
  if (updatedOnboarding.height !== null) responseData.height = updatedOnboarding.height;
  if (updatedOnboarding.targetWeight !== null) responseData.targetWeight = updatedOnboarding.targetWeight;
  if (updatedOnboarding.unitsSystem) responseData.unitsSystem = updatedOnboarding.unitsSystem;
  if (updatedOnboarding.dailyCalorieGoal !== null) responseData.dailyCalorieGoal = updatedOnboarding.dailyCalorieGoal;
  if (updatedOnboarding.completedAt) responseData.completedAt = updatedOnboarding.completedAt.toISOString();

  res.status(200).json({
    success: true,
    data: responseData,
  });
};

// ===========================================
// ONBOARDING QUESTIONS CONTROLLERS
// ===========================================

// POST /api/onboarding/questions - Save onboarding questions
export const saveOnboardingQuestions = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  // Parse and validate
  const parseResult = onboardingQuestionsSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid questions payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const questionsData = parseResult.data;

  // Ensure user exists
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    throw new ErrorHandler("User not found", 404);
  }

  // Clean and prepare data
  const cleanedData = cleanData(questionsData);

  // Prepare database data
  const dbData: Record<string, unknown> = {
    userId,
  };

  // Add optional fields
  if (cleanedData.reproductiveStage) dbData.reproductiveStage = cleanedData.reproductiveStage;
  if (cleanedData.healthGoal) dbData.healthGoal = cleanedData.healthGoal;
  if (cleanedData.birthControl) dbData.birthControl = cleanedData.birthControl;
  if (cleanedData.medicalDiagnoses) dbData.medicalDiagnoses = cleanedData.medicalDiagnoses;
  if (cleanedData.physicalSymptoms) dbData.physicalSymptoms = cleanedData.physicalSymptoms;
  if (cleanedData.pmsMood) dbData.pmsMood = cleanedData.pmsMood;
  if (cleanedData.stressLevel) dbData.stressLevel = cleanedData.stressLevel;
  if (cleanedData.foodStruggles) dbData.foodStruggles = cleanedData.foodStruggles;
  if (cleanedData.dietaryLifestyle) dbData.dietaryLifestyle = cleanedData.dietaryLifestyle;

  // Upsert questions data
  const questions = await prisma.onboardingQuestions.upsert({
    where: { userId },
    update: dbData as Prisma.OnboardingQuestionsUpdateInput,
    create: dbData as Prisma.OnboardingQuestionsCreateInput,
  });

  // Format response
  const responseData: Record<string, unknown> = {
    id: questions.id,
    userId: questions.userId,
    isCompleted: questions.isCompleted,
    createdAt: questions.createdAt.toISOString(),
    updatedAt: questions.updatedAt.toISOString(),
  };

  if (questions.reproductiveStage) responseData.reproductiveStage = questions.reproductiveStage;
  if (questions.healthGoal) responseData.healthGoal = questions.healthGoal;
  if (questions.birthControl.length > 0) responseData.birthControl = questions.birthControl;
  if (questions.medicalDiagnoses.length > 0) responseData.medicalDiagnoses = questions.medicalDiagnoses;
  if (questions.physicalSymptoms.length > 0) responseData.physicalSymptoms = questions.physicalSymptoms;
  if (questions.pmsMood) responseData.pmsMood = questions.pmsMood;
  if (questions.stressLevel) responseData.stressLevel = questions.stressLevel;
  if (questions.foodStruggles.length > 0) responseData.foodStruggles = questions.foodStruggles;
  if (questions.dietaryLifestyle) responseData.dietaryLifestyle = questions.dietaryLifestyle;
  if (questions.completedAt) responseData.completedAt = questions.completedAt.toISOString();

  res.status(201).json({
    success: true,
    data: responseData,
    message: "Onboarding questions saved successfully",
  });
};

// GET /api/onboarding/questions - Retrieve onboarding questions
export const getOnboardingQuestions = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  const questions = await prisma.onboardingQuestions.findUnique({
    where: { userId },
  });

  if (!questions) {
    return res.status(200).json({
      success: true,
      data: null,
    });
  }

  // Format response
  const responseData: Record<string, unknown> = {
    id: questions.id,
    userId: questions.userId,
    isCompleted: questions.isCompleted,
    createdAt: questions.createdAt.toISOString(),
    updatedAt: questions.updatedAt.toISOString(),
  };

  if (questions.reproductiveStage) responseData.reproductiveStage = questions.reproductiveStage;
  if (questions.healthGoal) responseData.healthGoal = questions.healthGoal;
  if (questions.birthControl.length > 0) responseData.birthControl = questions.birthControl;
  if (questions.medicalDiagnoses.length > 0) responseData.medicalDiagnoses = questions.medicalDiagnoses;
  if (questions.physicalSymptoms.length > 0) responseData.physicalSymptoms = questions.physicalSymptoms;
  if (questions.pmsMood) responseData.pmsMood = questions.pmsMood;
  if (questions.stressLevel) responseData.stressLevel = questions.stressLevel;
  if (questions.foodStruggles.length > 0) responseData.foodStruggles = questions.foodStruggles;
  if (questions.dietaryLifestyle) responseData.dietaryLifestyle = questions.dietaryLifestyle;
  if (questions.completedAt) responseData.completedAt = questions.completedAt.toISOString();

  res.status(200).json({
    success: true,
    data: responseData,
  });
};

// PATCH /api/onboarding/questions - Update onboarding questions
export const updateOnboardingQuestions = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  // Parse and validate
  const parseResult = updateOnboardingQuestionsSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const updateData = parseResult.data;

  // Check if questions data exists
  const existingQuestions = await prisma.onboardingQuestions.findUnique({
    where: { userId },
  });

  if (!existingQuestions) {
    throw new ErrorHandler("Onboarding questions not found. Please save questions first.", 404);
  }

  // Clean data
  const cleanedData = cleanData(updateData);

  // Prepare update data
  const dbUpdateData: Record<string, unknown> = {};

  if (cleanedData.reproductiveStage) dbUpdateData.reproductiveStage = cleanedData.reproductiveStage;
  if (cleanedData.healthGoal) dbUpdateData.healthGoal = cleanedData.healthGoal;
  if (cleanedData.birthControl) dbUpdateData.birthControl = cleanedData.birthControl;
  if (cleanedData.medicalDiagnoses) dbUpdateData.medicalDiagnoses = cleanedData.medicalDiagnoses;
  if (cleanedData.physicalSymptoms) dbUpdateData.physicalSymptoms = cleanedData.physicalSymptoms;
  if (cleanedData.pmsMood) dbUpdateData.pmsMood = cleanedData.pmsMood;
  if (cleanedData.stressLevel) dbUpdateData.stressLevel = cleanedData.stressLevel;
  if (cleanedData.foodStruggles) dbUpdateData.foodStruggles = cleanedData.foodStruggles;
  if (cleanedData.dietaryLifestyle) dbUpdateData.dietaryLifestyle = cleanedData.dietaryLifestyle;

  if (Object.keys(dbUpdateData).length === 0) {
    return res.status(200).json({
      success: true,
      data: existingQuestions,
    });
  }

  // Update questions data
  const updatedQuestions = await prisma.onboardingQuestions.update({
    where: { userId },
    data: dbUpdateData as Prisma.OnboardingQuestionsUpdateInput,
  });

  // Format response
  const responseData: Record<string, unknown> = {
    id: updatedQuestions.id,
    userId: updatedQuestions.userId,
    isCompleted: updatedQuestions.isCompleted,
    createdAt: updatedQuestions.createdAt.toISOString(),
    updatedAt: updatedQuestions.updatedAt.toISOString(),
  };

  if (updatedQuestions.reproductiveStage) responseData.reproductiveStage = updatedQuestions.reproductiveStage;
  if (updatedQuestions.healthGoal) responseData.healthGoal = updatedQuestions.healthGoal;
  if (updatedQuestions.birthControl.length > 0) responseData.birthControl = updatedQuestions.birthControl;
  if (updatedQuestions.medicalDiagnoses.length > 0) responseData.medicalDiagnoses = updatedQuestions.medicalDiagnoses;
  if (updatedQuestions.physicalSymptoms.length > 0) responseData.physicalSymptoms = updatedQuestions.physicalSymptoms;
  if (updatedQuestions.pmsMood) responseData.pmsMood = updatedQuestions.pmsMood;
  if (updatedQuestions.stressLevel) responseData.stressLevel = updatedQuestions.stressLevel;
  if (updatedQuestions.foodStruggles.length > 0) responseData.foodStruggles = updatedQuestions.foodStruggles;
  if (updatedQuestions.dietaryLifestyle) responseData.dietaryLifestyle = updatedQuestions.dietaryLifestyle;
  if (updatedQuestions.completedAt) responseData.completedAt = updatedQuestions.completedAt.toISOString();

  res.status(200).json({
    success: true,
    data: responseData,
  });
};

// ===========================================
// COMPLETION CONTROLLERS
// ===========================================

// POST /api/onboarding/complete - Mark onboarding as completed
export const completeOnboarding = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  // Check if onboarding data exists
  const onboarding = await prisma.onboarding.findUnique({
    where: { userId },
  });

  if (!onboarding) {
    throw new ErrorHandler("Onboarding data not found. Please save onboarding data first.", 404);
  }

  // Validate required fields
  if (!onboarding.averageCycleLength || !onboarding.periodDuration) {
    throw new ErrorHandler(
      "Cannot complete onboarding: averageCycleLength and periodDuration are required",
      400
    );
  }

  if (onboarding.averageCycleLength < 21 || onboarding.averageCycleLength > 40) {
    throw new ErrorHandler(
      "Cannot complete onboarding: averageCycleLength must be between 21 and 40",
      400
    );
  }

  if (onboarding.periodDuration < 1 || onboarding.periodDuration > 7) {
    throw new ErrorHandler(
      "Cannot complete onboarding: periodDuration must be between 1 and 7",
      400
    );
  }

  // Update onboarding to mark as completed
  const updatedOnboarding = await prisma.onboarding.update({
    where: { userId },
    data: {
      isCompleted: true,
      completedAt: new Date(),
    },
  });

  // Update UserProfile to mark onboarding as completed
  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      onboardingCompleted: true,
    },
    create: {
      userId,
      onboardingCompleted: true,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      completed: updatedOnboarding.isCompleted,
      completedAt: updatedOnboarding.completedAt?.toISOString(),
    },
    message: "Onboarding completed successfully",
  });
};

// POST /api/onboarding/questions/complete - Mark questions as completed
export const completeOnboardingQuestions = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  // Check if questions data exists
  const questions = await prisma.onboardingQuestions.findUnique({
    where: { userId },
  });

  if (!questions) {
    throw new ErrorHandler("Onboarding questions not found. Please save questions first.", 404);
  }

  // Update questions to mark as completed
  const updatedQuestions = await prisma.onboardingQuestions.update({
    where: { userId },
    data: {
      isCompleted: true,
      completedAt: new Date(),
    },
  });

  res.status(200).json({
    success: true,
    data: {
      completed: updatedQuestions.isCompleted,
      completedAt: updatedQuestions.completedAt?.toISOString(),
    },
    message: "Onboarding questions completed successfully",
  });
};

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeOnboardingQuestions = exports.completeOnboarding = exports.updateOnboardingQuestions = exports.getOnboardingQuestions = exports.saveOnboardingQuestions = exports.updateOnboarding = exports.getOnboarding = exports.saveOnboarding = void 0;
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
const onboardingSchemas_validation_1 = require("../validation/onboardingSchemas.validation");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
// ===========================================
// HELPER FUNCTIONS
// ===========================================
function cleanData(data) {
    const cleaned = {};
    for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null)
            continue;
        if (typeof value === 'string' && value.trim() === '')
            continue;
        if (Array.isArray(value) && value.length === 0)
            continue;
        cleaned[key] = value;
    }
    return cleaned;
}
// ===========================================
// ONBOARDING CONTROLLERS (Basic Profile)
// ===========================================
// POST /api/onboarding - Save onboarding data
const saveOnboarding = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    // Parse and validate
    const parseResult = onboardingSchemas_validation_1.onboardingSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new errorHandler_1.default("Invalid onboarding payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    const onboardingData = parseResult.data;
    // Ensure user exists
    const existingUser = await prismaClient_1.default.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
        throw new errorHandler_1.default("User not found", 404);
    }
    // Clean and prepare data
    const cleanedData = cleanData(onboardingData);
    // Prepare database data
    const dbData = {
        userId,
        averageCycleLength: cleanedData.averageCycleLength || 28,
        periodDuration: cleanedData.periodDuration || 5,
    };
    // Add optional fields
    if (cleanedData.dateOfBirth) {
        dbData.dateOfBirth = new Date(cleanedData.dateOfBirth);
    }
    if (cleanedData.weight !== undefined)
        dbData.weight = cleanedData.weight;
    if (cleanedData.height !== undefined)
        dbData.height = cleanedData.height;
    if (cleanedData.targetWeight !== undefined)
        dbData.targetWeight = cleanedData.targetWeight;
    if (cleanedData.unitsSystem)
        dbData.unitsSystem = cleanedData.unitsSystem;
    if (cleanedData.dailyCalorieGoal !== undefined)
        dbData.dailyCalorieGoal = cleanedData.dailyCalorieGoal;
    // Upsert onboarding data
    const onboarding = await prismaClient_1.default.onboarding.upsert({
        where: { userId },
        update: dbData,
        create: dbData,
    });
    // Format response
    const responseData = {
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
    if (onboarding.weight !== null)
        responseData.weight = onboarding.weight;
    if (onboarding.height !== null)
        responseData.height = onboarding.height;
    if (onboarding.targetWeight !== null)
        responseData.targetWeight = onboarding.targetWeight;
    if (onboarding.unitsSystem)
        responseData.unitsSystem = onboarding.unitsSystem;
    if (onboarding.dailyCalorieGoal !== null)
        responseData.dailyCalorieGoal = onboarding.dailyCalorieGoal;
    if (onboarding.completedAt)
        responseData.completedAt = onboarding.completedAt.toISOString();
    res.status(201).json({
        success: true,
        data: responseData,
        message: "Onboarding data saved successfully",
    });
};
exports.saveOnboarding = saveOnboarding;
// GET /api/onboarding - Retrieve onboarding data
const getOnboarding = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    const onboarding = await prismaClient_1.default.onboarding.findUnique({
        where: { userId },
    });
    if (!onboarding) {
        return res.status(200).json({
            success: true,
            data: null,
        });
    }
    // Format response
    const responseData = {
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
    if (onboarding.weight !== null)
        responseData.weight = onboarding.weight;
    if (onboarding.height !== null)
        responseData.height = onboarding.height;
    if (onboarding.targetWeight !== null)
        responseData.targetWeight = onboarding.targetWeight;
    if (onboarding.unitsSystem)
        responseData.unitsSystem = onboarding.unitsSystem;
    if (onboarding.dailyCalorieGoal !== null)
        responseData.dailyCalorieGoal = onboarding.dailyCalorieGoal;
    if (onboarding.completedAt)
        responseData.completedAt = onboarding.completedAt.toISOString();
    res.status(200).json({
        success: true,
        data: responseData,
    });
};
exports.getOnboarding = getOnboarding;
// PATCH /api/onboarding - Update onboarding data
const updateOnboarding = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    // Parse and validate
    const parseResult = onboardingSchemas_validation_1.updateOnboardingSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new errorHandler_1.default("Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    const updateData = parseResult.data;
    // Check if onboarding data exists
    const existingOnboarding = await prismaClient_1.default.onboarding.findUnique({
        where: { userId },
    });
    if (!existingOnboarding) {
        throw new errorHandler_1.default("Onboarding data not found. Please save onboarding data first.", 404);
    }
    // Clean data
    const cleanedData = cleanData(updateData);
    // Prepare update data
    const dbUpdateData = {};
    if (cleanedData.dateOfBirth) {
        dbUpdateData.dateOfBirth = new Date(cleanedData.dateOfBirth);
    }
    if (cleanedData.weight !== undefined)
        dbUpdateData.weight = cleanedData.weight;
    if (cleanedData.height !== undefined)
        dbUpdateData.height = cleanedData.height;
    if (cleanedData.targetWeight !== undefined)
        dbUpdateData.targetWeight = cleanedData.targetWeight;
    if (cleanedData.unitsSystem)
        dbUpdateData.unitsSystem = cleanedData.unitsSystem;
    if (cleanedData.dailyCalorieGoal !== undefined)
        dbUpdateData.dailyCalorieGoal = cleanedData.dailyCalorieGoal;
    if (cleanedData.averageCycleLength !== undefined)
        dbUpdateData.averageCycleLength = cleanedData.averageCycleLength;
    if (cleanedData.periodDuration !== undefined)
        dbUpdateData.periodDuration = cleanedData.periodDuration;
    if (Object.keys(dbUpdateData).length === 0) {
        return res.status(200).json({
            success: true,
            data: existingOnboarding,
        });
    }
    // Update onboarding data
    const updatedOnboarding = await prismaClient_1.default.onboarding.update({
        where: { userId },
        data: dbUpdateData,
    });
    // Format response
    const responseData = {
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
    if (updatedOnboarding.weight !== null)
        responseData.weight = updatedOnboarding.weight;
    if (updatedOnboarding.height !== null)
        responseData.height = updatedOnboarding.height;
    if (updatedOnboarding.targetWeight !== null)
        responseData.targetWeight = updatedOnboarding.targetWeight;
    if (updatedOnboarding.unitsSystem)
        responseData.unitsSystem = updatedOnboarding.unitsSystem;
    if (updatedOnboarding.dailyCalorieGoal !== null)
        responseData.dailyCalorieGoal = updatedOnboarding.dailyCalorieGoal;
    if (updatedOnboarding.completedAt)
        responseData.completedAt = updatedOnboarding.completedAt.toISOString();
    res.status(200).json({
        success: true,
        data: responseData,
    });
};
exports.updateOnboarding = updateOnboarding;
// ===========================================
// ONBOARDING QUESTIONS CONTROLLERS
// ===========================================
// POST /api/onboarding/questions - Save onboarding questions
const saveOnboardingQuestions = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    // Parse and validate
    const parseResult = onboardingSchemas_validation_1.onboardingQuestionsSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new errorHandler_1.default("Invalid questions payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    const questionsData = parseResult.data;
    // Ensure user exists
    const existingUser = await prismaClient_1.default.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
        throw new errorHandler_1.default("User not found", 404);
    }
    // Clean and prepare data
    const cleanedData = cleanData(questionsData);
    // Prepare database data
    const dbData = {
        userId,
    };
    // Add optional fields
    if (cleanedData.reproductiveStage)
        dbData.reproductiveStage = cleanedData.reproductiveStage;
    if (cleanedData.healthGoal)
        dbData.healthGoal = cleanedData.healthGoal;
    if (cleanedData.birthControl)
        dbData.birthControl = cleanedData.birthControl;
    if (cleanedData.medicalDiagnoses)
        dbData.medicalDiagnoses = cleanedData.medicalDiagnoses;
    if (cleanedData.physicalSymptoms)
        dbData.physicalSymptoms = cleanedData.physicalSymptoms;
    if (cleanedData.pmsMood)
        dbData.pmsMood = cleanedData.pmsMood;
    if (cleanedData.stressLevel)
        dbData.stressLevel = cleanedData.stressLevel;
    if (cleanedData.foodStruggles)
        dbData.foodStruggles = cleanedData.foodStruggles;
    if (cleanedData.dietaryLifestyle)
        dbData.dietaryLifestyle = cleanedData.dietaryLifestyle;
    // Upsert questions data
    const questions = await prismaClient_1.default.onboardingQuestions.upsert({
        where: { userId },
        update: dbData,
        create: dbData,
    });
    // Format response
    const responseData = {
        id: questions.id,
        userId: questions.userId,
        isCompleted: questions.isCompleted,
        createdAt: questions.createdAt.toISOString(),
        updatedAt: questions.updatedAt.toISOString(),
    };
    if (questions.reproductiveStage)
        responseData.reproductiveStage = questions.reproductiveStage;
    if (questions.healthGoal)
        responseData.healthGoal = questions.healthGoal;
    if (questions.birthControl.length > 0)
        responseData.birthControl = questions.birthControl;
    if (questions.medicalDiagnoses.length > 0)
        responseData.medicalDiagnoses = questions.medicalDiagnoses;
    if (questions.physicalSymptoms.length > 0)
        responseData.physicalSymptoms = questions.physicalSymptoms;
    if (questions.pmsMood)
        responseData.pmsMood = questions.pmsMood;
    if (questions.stressLevel)
        responseData.stressLevel = questions.stressLevel;
    if (questions.foodStruggles.length > 0)
        responseData.foodStruggles = questions.foodStruggles;
    if (questions.dietaryLifestyle)
        responseData.dietaryLifestyle = questions.dietaryLifestyle;
    if (questions.completedAt)
        responseData.completedAt = questions.completedAt.toISOString();
    res.status(201).json({
        success: true,
        data: responseData,
        message: "Onboarding questions saved successfully",
    });
};
exports.saveOnboardingQuestions = saveOnboardingQuestions;
// GET /api/onboarding/questions - Retrieve onboarding questions
const getOnboardingQuestions = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    const questions = await prismaClient_1.default.onboardingQuestions.findUnique({
        where: { userId },
    });
    if (!questions) {
        return res.status(200).json({
            success: true,
            data: null,
        });
    }
    // Format response
    const responseData = {
        id: questions.id,
        userId: questions.userId,
        isCompleted: questions.isCompleted,
        createdAt: questions.createdAt.toISOString(),
        updatedAt: questions.updatedAt.toISOString(),
    };
    if (questions.reproductiveStage)
        responseData.reproductiveStage = questions.reproductiveStage;
    if (questions.healthGoal)
        responseData.healthGoal = questions.healthGoal;
    if (questions.birthControl.length > 0)
        responseData.birthControl = questions.birthControl;
    if (questions.medicalDiagnoses.length > 0)
        responseData.medicalDiagnoses = questions.medicalDiagnoses;
    if (questions.physicalSymptoms.length > 0)
        responseData.physicalSymptoms = questions.physicalSymptoms;
    if (questions.pmsMood)
        responseData.pmsMood = questions.pmsMood;
    if (questions.stressLevel)
        responseData.stressLevel = questions.stressLevel;
    if (questions.foodStruggles.length > 0)
        responseData.foodStruggles = questions.foodStruggles;
    if (questions.dietaryLifestyle)
        responseData.dietaryLifestyle = questions.dietaryLifestyle;
    if (questions.completedAt)
        responseData.completedAt = questions.completedAt.toISOString();
    res.status(200).json({
        success: true,
        data: responseData,
    });
};
exports.getOnboardingQuestions = getOnboardingQuestions;
// PATCH /api/onboarding/questions - Update onboarding questions
const updateOnboardingQuestions = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    // Parse and validate
    const parseResult = onboardingSchemas_validation_1.updateOnboardingQuestionsSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new errorHandler_1.default("Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    const updateData = parseResult.data;
    // Check if questions data exists
    const existingQuestions = await prismaClient_1.default.onboardingQuestions.findUnique({
        where: { userId },
    });
    if (!existingQuestions) {
        throw new errorHandler_1.default("Onboarding questions not found. Please save questions first.", 404);
    }
    // Clean data
    const cleanedData = cleanData(updateData);
    // Prepare update data
    const dbUpdateData = {};
    if (cleanedData.reproductiveStage)
        dbUpdateData.reproductiveStage = cleanedData.reproductiveStage;
    if (cleanedData.healthGoal)
        dbUpdateData.healthGoal = cleanedData.healthGoal;
    if (cleanedData.birthControl)
        dbUpdateData.birthControl = cleanedData.birthControl;
    if (cleanedData.medicalDiagnoses)
        dbUpdateData.medicalDiagnoses = cleanedData.medicalDiagnoses;
    if (cleanedData.physicalSymptoms)
        dbUpdateData.physicalSymptoms = cleanedData.physicalSymptoms;
    if (cleanedData.pmsMood)
        dbUpdateData.pmsMood = cleanedData.pmsMood;
    if (cleanedData.stressLevel)
        dbUpdateData.stressLevel = cleanedData.stressLevel;
    if (cleanedData.foodStruggles)
        dbUpdateData.foodStruggles = cleanedData.foodStruggles;
    if (cleanedData.dietaryLifestyle)
        dbUpdateData.dietaryLifestyle = cleanedData.dietaryLifestyle;
    if (Object.keys(dbUpdateData).length === 0) {
        return res.status(200).json({
            success: true,
            data: existingQuestions,
        });
    }
    // Update questions data
    const updatedQuestions = await prismaClient_1.default.onboardingQuestions.update({
        where: { userId },
        data: dbUpdateData,
    });
    // Format response
    const responseData = {
        id: updatedQuestions.id,
        userId: updatedQuestions.userId,
        isCompleted: updatedQuestions.isCompleted,
        createdAt: updatedQuestions.createdAt.toISOString(),
        updatedAt: updatedQuestions.updatedAt.toISOString(),
    };
    if (updatedQuestions.reproductiveStage)
        responseData.reproductiveStage = updatedQuestions.reproductiveStage;
    if (updatedQuestions.healthGoal)
        responseData.healthGoal = updatedQuestions.healthGoal;
    if (updatedQuestions.birthControl.length > 0)
        responseData.birthControl = updatedQuestions.birthControl;
    if (updatedQuestions.medicalDiagnoses.length > 0)
        responseData.medicalDiagnoses = updatedQuestions.medicalDiagnoses;
    if (updatedQuestions.physicalSymptoms.length > 0)
        responseData.physicalSymptoms = updatedQuestions.physicalSymptoms;
    if (updatedQuestions.pmsMood)
        responseData.pmsMood = updatedQuestions.pmsMood;
    if (updatedQuestions.stressLevel)
        responseData.stressLevel = updatedQuestions.stressLevel;
    if (updatedQuestions.foodStruggles.length > 0)
        responseData.foodStruggles = updatedQuestions.foodStruggles;
    if (updatedQuestions.dietaryLifestyle)
        responseData.dietaryLifestyle = updatedQuestions.dietaryLifestyle;
    if (updatedQuestions.completedAt)
        responseData.completedAt = updatedQuestions.completedAt.toISOString();
    res.status(200).json({
        success: true,
        data: responseData,
    });
};
exports.updateOnboardingQuestions = updateOnboardingQuestions;
// ===========================================
// COMPLETION CONTROLLERS
// ===========================================
// POST /api/onboarding/complete - Mark onboarding as completed
const completeOnboarding = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    // Check if onboarding data exists
    const onboarding = await prismaClient_1.default.onboarding.findUnique({
        where: { userId },
    });
    if (!onboarding) {
        throw new errorHandler_1.default("Onboarding data not found. Please save onboarding data first.", 404);
    }
    // Validate required fields
    if (!onboarding.averageCycleLength || !onboarding.periodDuration) {
        throw new errorHandler_1.default("Cannot complete onboarding: averageCycleLength and periodDuration are required", 400);
    }
    if (onboarding.averageCycleLength < 21 || onboarding.averageCycleLength > 40) {
        throw new errorHandler_1.default("Cannot complete onboarding: averageCycleLength must be between 21 and 40", 400);
    }
    if (onboarding.periodDuration < 1 || onboarding.periodDuration > 7) {
        throw new errorHandler_1.default("Cannot complete onboarding: periodDuration must be between 1 and 7", 400);
    }
    // Update onboarding to mark as completed
    const updatedOnboarding = await prismaClient_1.default.onboarding.update({
        where: { userId },
        data: {
            isCompleted: true,
            completedAt: new Date(),
        },
    });
    // Update UserProfile to mark onboarding as completed
    await prismaClient_1.default.userProfile.upsert({
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
exports.completeOnboarding = completeOnboarding;
// POST /api/onboarding/questions/complete - Mark questions as completed
const completeOnboardingQuestions = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    // Check if questions data exists
    const questions = await prismaClient_1.default.onboardingQuestions.findUnique({
        where: { userId },
    });
    if (!questions) {
        throw new errorHandler_1.default("Onboarding questions not found. Please save questions first.", 404);
    }
    // Update questions to mark as completed
    const updatedQuestions = await prismaClient_1.default.onboardingQuestions.update({
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
exports.completeOnboardingQuestions = completeOnboardingQuestions;

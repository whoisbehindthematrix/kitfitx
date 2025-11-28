"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOnboarding = exports.completeOnboarding = exports.getOnboarding = exports.saveOnboarding = void 0;
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
const onboardingSchemas_validation_1 = require("../validation/onboardingSchemas.validation");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const onboarding_types_1 = require("../types/onboarding.types");
// Helper function to clean data (remove undefined, null, empty arrays, empty strings)
function cleanOnboardingData(data) {
    const cleaned = {};
    for (const [key, value] of Object.entries(data)) {
        // Skip undefined and null
        if (value === undefined || value === null)
            continue;
        // Skip empty strings
        if (typeof value === 'string' && value.trim() === '')
            continue;
        // Skip empty arrays
        if (Array.isArray(value) && value.length === 0)
            continue;
        cleaned[key] = value;
    }
    return cleaned;
}
// Helper function to transform enum values to numbers
function transformOnboardingData(data) {
    const transformed = { ...data };
    // Transform cycleLength enum to averageCycleLength if provided
    if (data.cycleLength && !data.averageCycleLength) {
        transformed.averageCycleLength = (0, onboarding_types_1.transformCycleLengthEnumToNumber)(data.cycleLength);
    }
    // Calculate age from dateOfBirth if age is not provided
    if (data.dateOfBirth && !data.age) {
        transformed.age = (0, onboarding_types_1.calculateAgeFromDateOfBirth)(data.dateOfBirth);
    }
    // Convert dateOfBirth string to Date object for database
    if (data.dateOfBirth) {
        transformed.dateOfBirth = new Date(data.dateOfBirth);
    }
    return transformed;
}
// POST /api/onboarding - Save onboarding data
const saveOnboarding = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    // Parse and validate incoming onboarding data
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
    // Transform data (enum to number, calculate age, etc.)
    const transformedData = transformOnboardingData(onboardingData);
    // Clean data (remove undefined, null, empty arrays, empty strings)
    const cleanedData = cleanOnboardingData(transformedData);
    // Prepare data for database
    const dbData = {
        userId,
        averageCycleLength: cleanedData.averageCycleLength || 28,
        periodDuration: cleanedData.periodDuration || 5,
    };
    // Add optional fields if they exist
    if (cleanedData.dateOfBirth)
        dbData.dateOfBirth = cleanedData.dateOfBirth;
    if (cleanedData.age !== undefined)
        dbData.age = cleanedData.age;
    if (cleanedData.weightRange)
        dbData.weightRange = cleanedData.weightRange;
    if (cleanedData.heightRange)
        dbData.heightRange = cleanedData.heightRange;
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
    if (cleanedData.cycleLength)
        dbData.cycleLength = cleanedData.cycleLength;
    // Upsert onboarding data
    const onboarding = await prismaClient_1.default.onboardingData.upsert({
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
    if (onboarding.dateOfBirth)
        responseData.dateOfBirth = onboarding.dateOfBirth.toISOString().split('T')[0];
    if (onboarding.age !== null)
        responseData.age = onboarding.age;
    if (onboarding.weightRange)
        responseData.weightRange = onboarding.weightRange;
    if (onboarding.heightRange)
        responseData.heightRange = onboarding.heightRange;
    if (onboarding.reproductiveStage)
        responseData.reproductiveStage = onboarding.reproductiveStage;
    if (onboarding.healthGoal)
        responseData.healthGoal = onboarding.healthGoal;
    if (onboarding.birthControl.length > 0)
        responseData.birthControl = onboarding.birthControl;
    if (onboarding.medicalDiagnoses.length > 0)
        responseData.medicalDiagnoses = onboarding.medicalDiagnoses;
    if (onboarding.physicalSymptoms.length > 0)
        responseData.physicalSymptoms = onboarding.physicalSymptoms;
    if (onboarding.pmsMood)
        responseData.pmsMood = onboarding.pmsMood;
    if (onboarding.stressLevel)
        responseData.stressLevel = onboarding.stressLevel;
    if (onboarding.foodStruggles.length > 0)
        responseData.foodStruggles = onboarding.foodStruggles;
    if (onboarding.dietaryLifestyle)
        responseData.dietaryLifestyle = onboarding.dietaryLifestyle;
    if (onboarding.cycleLength)
        responseData.cycleLength = onboarding.cycleLength;
    if (onboarding.completedAt)
        responseData.completedAt = onboarding.completedAt.toISOString();
    res.status(201).json({
        success: true,
        data: responseData,
        message: "Onboarding data saved successfully",
    });
};
exports.saveOnboarding = saveOnboarding;
// GET /api/onboarding - Retrieve saved onboarding data
const getOnboarding = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    const onboarding = await prismaClient_1.default.onboardingData.findUnique({
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
    if (onboarding.dateOfBirth)
        responseData.dateOfBirth = onboarding.dateOfBirth.toISOString().split('T')[0];
    if (onboarding.age !== null)
        responseData.age = onboarding.age;
    if (onboarding.weightRange)
        responseData.weightRange = onboarding.weightRange;
    if (onboarding.heightRange)
        responseData.heightRange = onboarding.heightRange;
    if (onboarding.reproductiveStage)
        responseData.reproductiveStage = onboarding.reproductiveStage;
    if (onboarding.healthGoal)
        responseData.healthGoal = onboarding.healthGoal;
    if (onboarding.birthControl.length > 0)
        responseData.birthControl = onboarding.birthControl;
    if (onboarding.medicalDiagnoses.length > 0)
        responseData.medicalDiagnoses = onboarding.medicalDiagnoses;
    if (onboarding.physicalSymptoms.length > 0)
        responseData.physicalSymptoms = onboarding.physicalSymptoms;
    if (onboarding.pmsMood)
        responseData.pmsMood = onboarding.pmsMood;
    if (onboarding.stressLevel)
        responseData.stressLevel = onboarding.stressLevel;
    if (onboarding.foodStruggles.length > 0)
        responseData.foodStruggles = onboarding.foodStruggles;
    if (onboarding.dietaryLifestyle)
        responseData.dietaryLifestyle = onboarding.dietaryLifestyle;
    if (onboarding.cycleLength)
        responseData.cycleLength = onboarding.cycleLength;
    if (onboarding.completedAt)
        responseData.completedAt = onboarding.completedAt.toISOString();
    res.status(200).json({
        success: true,
        data: responseData,
    });
};
exports.getOnboarding = getOnboarding;
// POST /api/onboarding/complete - Mark onboarding as completed
const completeOnboarding = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    // Check if onboarding data exists
    const onboarding = await prismaClient_1.default.onboardingData.findUnique({
        where: { userId },
    });
    if (!onboarding) {
        throw new errorHandler_1.default("Onboarding data not found. Please save onboarding data first.", 404);
    }
    // Validate required fields before completion
    if (!onboarding.averageCycleLength || !onboarding.periodDuration) {
        throw new errorHandler_1.default("Cannot complete onboarding: averageCycleLength and periodDuration are required", 400);
    }
    // Validate ranges
    if (onboarding.averageCycleLength < 21 || onboarding.averageCycleLength > 40) {
        throw new errorHandler_1.default("Cannot complete onboarding: averageCycleLength must be between 21 and 40", 400);
    }
    if (onboarding.periodDuration < 1 || onboarding.periodDuration > 7) {
        throw new errorHandler_1.default("Cannot complete onboarding: periodDuration must be between 1 and 7", 400);
    }
    // Update onboarding data to mark as completed
    const updatedOnboarding = await prismaClient_1.default.onboardingData.update({
        where: { userId },
        data: {
            isCompleted: true,
            completedAt: new Date(),
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
// PATCH /api/onboarding - Update specific fields
const updateOnboarding = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    // Parse and validate update data
    const parseResult = onboardingSchemas_validation_1.updateOnboardingSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new errorHandler_1.default("Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    const updateData = parseResult.data;
    // Check if onboarding data exists
    const existingOnboarding = await prismaClient_1.default.onboardingData.findUnique({
        where: { userId },
    });
    if (!existingOnboarding) {
        throw new errorHandler_1.default("Onboarding data not found. Please save onboarding data first.", 404);
    }
    // Transform data if needed
    const transformedData = transformOnboardingData(updateData);
    // Clean data
    const cleanedData = cleanOnboardingData(transformedData);
    // Prepare update data for database
    const dbUpdateData = {};
    // Only include fields that are being updated
    if (cleanedData.dateOfBirth)
        dbUpdateData.dateOfBirth = cleanedData.dateOfBirth;
    if (cleanedData.age !== undefined)
        dbUpdateData.age = cleanedData.age;
    if (cleanedData.averageCycleLength !== undefined)
        dbUpdateData.averageCycleLength = cleanedData.averageCycleLength;
    if (cleanedData.periodDuration !== undefined)
        dbUpdateData.periodDuration = cleanedData.periodDuration;
    if (cleanedData.weightRange)
        dbUpdateData.weightRange = cleanedData.weightRange;
    if (cleanedData.heightRange)
        dbUpdateData.heightRange = cleanedData.heightRange;
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
    if (cleanedData.cycleLength)
        dbUpdateData.cycleLength = cleanedData.cycleLength;
    // If no fields to update, return current data
    if (Object.keys(dbUpdateData).length === 0) {
        const currentData = await prismaClient_1.default.onboardingData.findUnique({
            where: { userId },
        });
        return res.status(200).json({
            success: true,
            data: currentData,
        });
    }
    // Update onboarding data
    const updatedOnboarding = await prismaClient_1.default.onboardingData.update({
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
    if (updatedOnboarding.dateOfBirth)
        responseData.dateOfBirth = updatedOnboarding.dateOfBirth.toISOString().split('T')[0];
    if (updatedOnboarding.age !== null)
        responseData.age = updatedOnboarding.age;
    if (updatedOnboarding.weightRange)
        responseData.weightRange = updatedOnboarding.weightRange;
    if (updatedOnboarding.heightRange)
        responseData.heightRange = updatedOnboarding.heightRange;
    if (updatedOnboarding.reproductiveStage)
        responseData.reproductiveStage = updatedOnboarding.reproductiveStage;
    if (updatedOnboarding.healthGoal)
        responseData.healthGoal = updatedOnboarding.healthGoal;
    if (updatedOnboarding.birthControl.length > 0)
        responseData.birthControl = updatedOnboarding.birthControl;
    if (updatedOnboarding.medicalDiagnoses.length > 0)
        responseData.medicalDiagnoses = updatedOnboarding.medicalDiagnoses;
    if (updatedOnboarding.physicalSymptoms.length > 0)
        responseData.physicalSymptoms = updatedOnboarding.physicalSymptoms;
    if (updatedOnboarding.pmsMood)
        responseData.pmsMood = updatedOnboarding.pmsMood;
    if (updatedOnboarding.stressLevel)
        responseData.stressLevel = updatedOnboarding.stressLevel;
    if (updatedOnboarding.foodStruggles.length > 0)
        responseData.foodStruggles = updatedOnboarding.foodStruggles;
    if (updatedOnboarding.dietaryLifestyle)
        responseData.dietaryLifestyle = updatedOnboarding.dietaryLifestyle;
    if (updatedOnboarding.cycleLength)
        responseData.cycleLength = updatedOnboarding.cycleLength;
    if (updatedOnboarding.completedAt)
        responseData.completedAt = updatedOnboarding.completedAt.toISOString();
    res.status(200).json({
        success: true,
        data: responseData,
    });
};
exports.updateOnboarding = updateOnboarding;

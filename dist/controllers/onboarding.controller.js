"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeOnboarding = void 0;
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
const profileSchemas_validation_js_1 = require("../validation/profileSchemas.validation.js");
const errorHandler_js_1 = __importDefault(require("../utils/errorHandler.js"));
const completeOnboarding = async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.sub) {
            throw new errorHandler_js_1.default("User not authenticated", 401);
        }
        const userId = user.sub;
        // Parse and validate incoming onboarding data
        const parseResult = profileSchemas_validation_js_1.onboardingSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new errorHandler_js_1.default("Invalid onboarding payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
        }
        const onboardingData = parseResult.data;
        // Ensure base user exists
        const existingUser = await prismaClient_1.default.user.findUnique({ where: { id: userId } });
        if (!existingUser) {
            throw new errorHandler_js_1.default("User not found", 404);
        }
        // Prepare profile data for update
        const updateData = {
            onboardingCompleted: true,
            lastSyncedAt: new Date(),
            averageCycleLength: onboardingData.averageCycleLength,
        };
        // Handle dateOfBirth - convert from age if provided, or use dateOfBirth directly
        if (onboardingData.age) {
            // Calculate date of birth from age (approximate)
            const birthYear = new Date().getFullYear() - onboardingData.age;
            updateData.dateOfBirth = new Date(birthYear, 0, 1);
        }
        else if (onboardingData.dateOfBirth) {
            updateData.dateOfBirth = new Date(onboardingData.dateOfBirth);
        }
        // Add optional fields
        if (onboardingData.displayName !== undefined) {
            // Update user displayName if provided
            await prismaClient_1.default.user.update({
                where: { id: userId },
                data: { displayName: onboardingData.displayName },
            });
        }
        if (onboardingData.lutealPhaseDays !== undefined) {
            updateData.lutealPhaseDays = onboardingData.lutealPhaseDays;
        }
        if (onboardingData.activityLevel !== undefined) {
            updateData.activityLevel = onboardingData.activityLevel;
        }
        if (onboardingData.wellnessGoals !== undefined) {
            updateData.wellnessGoals = onboardingData.wellnessGoals;
        }
        // Upsert profile with onboarding data
        await prismaClient_1.default.userProfile.upsert({
            where: { userId },
            update: updateData,
            create: { userId, ...updateData },
        });
        // Refetch user with profile for response
        const fullUser = await prismaClient_1.default.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });
        if (!fullUser) {
            throw new errorHandler_js_1.default("Failed to fetch updated user", 500);
        }
        res.json({
            success: true,
            message: "Onboarding completed successfully",
            user: {
                id: fullUser.id,
                email: fullUser.email,
                displayName: fullUser.displayName,
                avatarUrl: fullUser.avatarUrl,
                profile: fullUser.profile,
                onboardingCompleted: fullUser.profile?.onboardingCompleted ?? false,
            },
        });
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Failed to complete onboarding", 500);
    }
};
exports.completeOnboarding = completeOnboarding;

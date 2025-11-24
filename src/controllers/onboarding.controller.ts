import { Request, Response } from "express";
import prisma from "../lib/prismaClient";
import { onboardingSchema } from "../validation/profileSchemas.validation.js";
import ErrorHandler from "@/utils/errorHandler.js";

export const completeOnboarding = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.sub) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    const userId = user.sub;

    // Parse and validate incoming onboarding data
    const parseResult = onboardingSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ErrorHandler(
        "Invalid onboarding payload: " + parseResult.error.issues.map((e: { message: string }) => e.message).join(", "),
        400
      );
    }

    const onboardingData = parseResult.data;

    // Ensure base user exists
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new ErrorHandler("User not found", 404);
    }

    // Prepare profile data for update
    const updateData: Record<string, unknown> = {
      onboardingCompleted: true,
      lastSyncedAt: new Date(),
      averageCycleLength: onboardingData.averageCycleLength,
    };

    // Handle dateOfBirth - convert from age if provided, or use dateOfBirth directly
    if (onboardingData.age) {
      // Calculate date of birth from age (approximate)
      const birthYear = new Date().getFullYear() - onboardingData.age;
      updateData.dateOfBirth = new Date(birthYear, 0, 1);
    } else if (onboardingData.dateOfBirth) {
      updateData.dateOfBirth = new Date(onboardingData.dateOfBirth);
    }

    // Add optional fields
    if (onboardingData.displayName !== undefined) {
      // Update user displayName if provided
      await prisma.user.update({
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
    await prisma.userProfile.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });

    // Refetch user with profile for response
    const fullUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!fullUser) {
      throw new ErrorHandler("Failed to fetch updated user", 500);
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
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to complete onboarding",
      500
    );
  }
};


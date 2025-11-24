import { Request, Response } from "express";
import prisma from "../lib/prismaClient";
import { Prisma } from "@prisma/client"; // Add this import
import { updateProfileSchema } from "../validation/profileSchemas.validation";
import ErrorHandler from "@/utils/errorHandler.js";

interface AuthUser {
  sub: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export const upsertProfile = async (req: Request, res: Response) => {
  // Parse and validate incoming profile fields
  const parseResult = updateProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid profile payload: " + parseResult.error.issues.map((e: { message: string }) => e.message).join(", "),
      400
    );
  }

  const profileData = parseResult.data;

  const authUser = req.user as AuthUser | undefined;
  if (!authUser?.sub) {
    throw new ErrorHandler("Unauthorized", 401);
  }

  const userId = authUser.sub;

  // Ensure base user exists (will throw if not)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  // Prepare profile data for Prisma (handle dates and JSON fields)
  const updateData: Record<string, unknown> = {};
  
  // Handle date fields
  if (profileData.dateOfBirth) {
    updateData.dateOfBirth = new Date(profileData.dateOfBirth);
  }
  if (profileData.lastPeriodStart) {
    updateData.lastPeriodStart = new Date(profileData.lastPeriodStart);
  }

  // Copy other fields (excluding dates and JSON)
  Object.entries(profileData).forEach(([key, value]) => {
    if (key !== "dateOfBirth" && key !== "lastPeriodStart" && key !== "notifications" && value !== undefined) {
      updateData[key] = value;
    }
  });

  // Handle notifications JSON field separately
  if (profileData.notifications !== undefined) {
    updateData.notifications = profileData.notifications as Prisma.InputJsonValue;
  }

  // Upsert by unique userId
  const profile = await prisma.userProfile.upsert({
    where: { userId },
    update: updateData,
    create: { userId, ...updateData },
  });

  return res.status(200).json({
    success: true,
    message: "Profile saved",
    data: profile,
  });
};

export const getProfile = async (req: Request, res: Response) => {
  const authUser = (req as unknown as { user?: { sub?: string } }).user;
  if (!authUser?.sub) {
    throw new ErrorHandler("Unauthorized", 401);
  }

  const userId = authUser.sub;

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return res.status(200).json({
      success: true,
      message: "Profile not found yet",
      data: null,
    });
  }

  return res.status(200).json({
    success: true,
    data: profile,
  });
};

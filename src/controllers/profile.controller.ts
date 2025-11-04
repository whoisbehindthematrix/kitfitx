import { Request, Response } from "express";
import prisma from "../lib/prismaClient";
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
      "Invalid profile payload: " + parseResult.error.errors.map(e => e.message).join(", "),
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

  // Upsert by unique userId
  const profile = await prisma.userProfile.upsert({
    where: { userId },
    update: { ...profileData },
    create: { userId, ...profileData },
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

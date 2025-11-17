import prisma from "../lib/prismaClient";
import { updateProfileSchema } from "../validation/profileSchemas.validation";
import ErrorHandler from "../utils/errorHandler.js";
export const upsertProfile = async (req, res) => {
    // Parse and validate incoming profile fields
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new ErrorHandler("Invalid profile payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    const profileData = parseResult.data;
    const authUser = req.user;
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
export const getProfile = async (req, res) => {
    const authUser = req.user;
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

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.upsertProfile = void 0;
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
const profileSchemas_validation_1 = require("../validation/profileSchemas.validation");
const errorHandler_js_1 = __importDefault(require("../utils/errorHandler.js"));
const upsertProfile = async (req, res) => {
    // Parse and validate incoming profile fields
    const parseResult = profileSchemas_validation_1.updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new errorHandler_js_1.default("Invalid profile payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    const profileData = parseResult.data;
    const authUser = req.user;
    if (!authUser?.sub) {
        throw new errorHandler_js_1.default("Unauthorized", 401);
    }
    const userId = authUser.sub;
    // Ensure base user exists (will throw if not)
    const user = await prismaClient_1.default.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new errorHandler_js_1.default("User not found", 404);
    }
    // Prepare profile data for Prisma (handle dates and JSON fields)
    const updateData = {};
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
        updateData.notifications = profileData.notifications;
    }
    // Upsert by unique userId
    const profile = await prismaClient_1.default.userProfile.upsert({
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
exports.upsertProfile = upsertProfile;
const getProfile = async (req, res) => {
    const authUser = req.user;
    if (!authUser?.sub) {
        throw new errorHandler_js_1.default("Unauthorized", 401);
    }
    const userId = authUser.sub;
    const profile = await prismaClient_1.default.userProfile.findUnique({
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
exports.getProfile = getProfile;

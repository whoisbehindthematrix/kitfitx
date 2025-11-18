"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.upsertProfile = void 0;
const prismaClient_js_1 = __importDefault(require("../lib/prismaClient.js"));
const profileSchemas_validation_js_1 = require("../validation/profileSchemas.validation.js");
const errorHandler_js_1 = __importDefault(require("../utils/errorHandler.js"));
const upsertProfile = async (req, res) => {
    // Parse and validate incoming profile fields
    const parseResult = profileSchemas_validation_js_1.updateProfileSchema.safeParse(req.body);
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
    const user = await prismaClient_js_1.default.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new errorHandler_js_1.default("User not found", 404);
    }
    // Upsert by unique userId
    const profile = await prismaClient_js_1.default.userProfile.upsert({
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
exports.upsertProfile = upsertProfile;
const getProfile = async (req, res) => {
    const authUser = req.user;
    if (!authUser?.sub) {
        throw new errorHandler_js_1.default("Unauthorized", 401);
    }
    const userId = authUser.sub;
    const profile = await prismaClient_js_1.default.userProfile.findUnique({
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

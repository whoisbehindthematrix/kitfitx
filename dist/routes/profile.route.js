import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { upsertProfile, getProfile } from "../controllers/profile.controller";
import { TryCatch } from "../middlewares/error";
const router = express.Router();
// Single route to create or update profile (idempotent upsert)
router.put("/", authMiddleware, TryCatch(upsertProfile));
router.get("/", authMiddleware, TryCatch(getProfile));
export default router;

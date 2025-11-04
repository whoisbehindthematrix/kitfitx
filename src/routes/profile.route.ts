import express from "express";
import { verifySupabaseToken } from "../middlewares/auth.middleware";
import { upsertProfile, getProfile } from "../controllers/profile.controller";
import { TryCatch } from "../middlewares/error";

const router = express.Router();

// Single route to create or update profile (idempotent upsert)
router.put("/", verifySupabaseToken, TryCatch(upsertProfile));

router.get("/", verifySupabaseToken, TryCatch(getProfile));

export default router;



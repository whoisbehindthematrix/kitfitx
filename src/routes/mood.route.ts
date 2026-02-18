import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { TryCatch } from "../middlewares/error";
import { getMoodScore } from "../controllers/mood.controller";

const router = express.Router();

// ===========================================
// MOOD ROUTES
// ===========================================

// GET /api/mood/score - Get mood score
router.get("/score", authMiddleware, TryCatch(getMoodScore));

export default router;

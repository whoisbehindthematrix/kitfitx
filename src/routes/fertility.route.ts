import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { TryCatch } from "../middlewares/error";
import { getFertilityScore } from "../controllers/fertility.controller";

const router = express.Router();

// ===========================================
// FERTILITY ROUTES
// ===========================================

// GET /api/fertility/score - Get fertility score and window
router.get("/score", authMiddleware, TryCatch(getFertilityScore));

export default router;

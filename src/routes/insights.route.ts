import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { TryCatch } from "../middlewares/error";
import {
  getHealthSummary,
  getRecommendations,
  getTrends,
} from "../controllers/insights.controller";

const router = express.Router();

// ===========================================
// HEALTH INSIGHTS ROUTES
// ===========================================

// GET /api/insights/summary - Get daily health summary
router.get("/summary", authMiddleware, TryCatch(getHealthSummary));

// GET /api/insights/recommendations - Get AI-generated recommendations
router.get("/recommendations", authMiddleware, TryCatch(getRecommendations));

// GET /api/insights/trends - Get health trends over date range
router.get("/trends", authMiddleware, TryCatch(getTrends));

export default router;

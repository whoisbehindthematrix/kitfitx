import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { TryCatch } from "../middlewares/error";
import {
  getPredictionOverview,
  askPredictionQuestion,
} from "../controllers/prediction.controller";

const router = express.Router();

// ===========================================
// AI PREDICTION ROUTES
// ===========================================

// GET /api/predictions/overview - Get comprehensive prediction overview
router.get("/overview", authMiddleware, TryCatch(getPredictionOverview));

// POST /api/predictions/ask - Ask a question about health data
router.post("/ask", authMiddleware, TryCatch(askPredictionQuestion));

export default router;

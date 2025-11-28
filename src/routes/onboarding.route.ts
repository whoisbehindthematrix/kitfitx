import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  saveOnboarding,
  getOnboarding,
  completeOnboarding,
  updateOnboarding,
} from "../controllers/onboarding.controller";
import { TryCatch } from "../middlewares/error";

const router = express.Router();

// All routes require authentication
router.post("/", authMiddleware, TryCatch(saveOnboarding));
router.get("/", authMiddleware, TryCatch(getOnboarding));
router.post("/complete", authMiddleware, TryCatch(completeOnboarding));
router.patch("/", authMiddleware, TryCatch(updateOnboarding));

export default router;

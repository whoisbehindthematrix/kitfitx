import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  // Onboarding (Basic Profile)
  saveOnboarding,
  getOnboarding,
  updateOnboarding,
  completeOnboarding,
  // Onboarding Questions
  saveOnboardingQuestions,
  getOnboardingQuestions,
  updateOnboardingQuestions,
  completeOnboardingQuestions,
} from "../controllers/onboarding.controller";
import { TryCatch } from "../middlewares/error";

const router = express.Router();

// All routes require authentication

// ===========================================
// ONBOARDING ROUTES (Basic Profile)
// ===========================================
router.post("/", authMiddleware, TryCatch(saveOnboarding));
router.get("/", authMiddleware, TryCatch(getOnboarding));
router.patch("/", authMiddleware, TryCatch(updateOnboarding));
router.post("/complete", authMiddleware, TryCatch(completeOnboarding));

// ===========================================
// ONBOARDING QUESTIONS ROUTES (Questionnaire)
// ===========================================
router.post("/questions", authMiddleware, TryCatch(saveOnboardingQuestions));
router.get("/questions", authMiddleware, TryCatch(getOnboardingQuestions));
router.patch("/questions", authMiddleware, TryCatch(updateOnboardingQuestions));
router.post("/questions/complete", authMiddleware, TryCatch(completeOnboardingQuestions));

export default router;

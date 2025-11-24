import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { completeOnboarding } from "../controllers/onboarding.controller";
import { TryCatch } from "../middlewares/error";

const router = express.Router();

router.post("/", authMiddleware, TryCatch(completeOnboarding));

export default router;


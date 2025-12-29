"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const onboarding_controller_1 = require("../controllers/onboarding.controller");
const error_1 = require("../middlewares/error");
const router = express_1.default.Router();
// All routes require authentication
// ===========================================
// ONBOARDING ROUTES (Basic Profile)
// ===========================================
router.post("/", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(onboarding_controller_1.saveOnboarding));
router.get("/", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(onboarding_controller_1.getOnboarding));
router.patch("/", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(onboarding_controller_1.updateOnboarding));
router.post("/complete", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(onboarding_controller_1.completeOnboarding));
// ===========================================
// ONBOARDING QUESTIONS ROUTES (Questionnaire)
// ===========================================
router.post("/questions", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(onboarding_controller_1.saveOnboardingQuestions));
router.get("/questions", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(onboarding_controller_1.getOnboardingQuestions));
router.patch("/questions", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(onboarding_controller_1.updateOnboardingQuestions));
router.post("/questions/complete", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(onboarding_controller_1.completeOnboardingQuestions));
exports.default = router;

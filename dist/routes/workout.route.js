"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const workout_controller_1 = require("../controllers/workout.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const error_1 = require("../middlewares/error");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// ===========================================
// EXERCISE LIBRARY ROUTES
// ===========================================
router.get("/exercises", (0, error_1.TryCatch)(workout_controller_1.getExercises));
router.get("/exercises/recommended", (0, error_1.TryCatch)(workout_controller_1.getRecommendedExercises));
// ===========================================
// EXERCISE ENTRY ROUTES (Cardio/Yoga Activities)
// ===========================================
// PURPOSE: Track simple cardio/yoga activities (running, yoga, cycling, walking)
// DIFFERENCE from WorkoutSession:
//   - WorkoutSession = Strength training with sets/reps/weight
//   - ExerciseEntry = Simple cardio/yoga with duration/distance/calories
// USAGE: Log activities like "Ran 5km in 30 minutes" or "Yoga for 60 minutes"
// LINKED: Each entry requires exerciseId linking to ExerciseLibrary
// IMPORTANT: These specific routes MUST come before /exercises/:id to avoid route conflicts
router.get("/exercises/entries", (0, error_1.TryCatch)(workout_controller_1.getExerciseEntries));
router.post("/exercises/entries", (0, error_1.TryCatch)(workout_controller_1.createExerciseEntry));
router.put("/exercises/entries/:id", (0, error_1.TryCatch)(workout_controller_1.updateExerciseEntry));
router.delete("/exercises/entries/:id", (0, error_1.TryCatch)(workout_controller_1.deleteExerciseEntry));
// Parameterized routes (must come AFTER specific routes)
router.get("/exercises/:id", (0, error_1.TryCatch)(workout_controller_1.getExercise));
router.post("/exercises", (0, error_1.TryCatch)(workout_controller_1.createExercise));
router.put("/exercises/:id", (0, error_1.TryCatch)(workout_controller_1.updateExercise));
router.delete("/exercises/:id", (0, error_1.TryCatch)(workout_controller_1.deleteExercise));
// ===========================================
// WORKOUT TEMPLATE ROUTES
// ===========================================
router.get("/templates", (0, error_1.TryCatch)(workout_controller_1.getTemplates));
router.post("/templates", (0, error_1.TryCatch)(workout_controller_1.createTemplate));
router.put("/templates/:id", (0, error_1.TryCatch)(workout_controller_1.updateTemplate));
router.delete("/templates/:id", (0, error_1.TryCatch)(workout_controller_1.deleteTemplate));
// ===========================================
// WORKOUT SESSION ROUTES
// ===========================================
router.get("/sessions", (0, error_1.TryCatch)(workout_controller_1.getSessions));
router.get("/sessions/:id", (0, error_1.TryCatch)(workout_controller_1.getSession));
router.post("/sessions", (0, error_1.TryCatch)(workout_controller_1.createSession));
router.put("/sessions/:id", (0, error_1.TryCatch)(workout_controller_1.updateSession));
router.delete("/sessions/:id", (0, error_1.TryCatch)(workout_controller_1.deleteSession));
// ===========================================
// ANALYTICS ROUTES
// ===========================================
router.get("/analytics", (0, error_1.TryCatch)(workout_controller_1.getAnalytics));
exports.default = router;

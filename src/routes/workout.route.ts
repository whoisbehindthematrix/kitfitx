import { Router } from "express";
import {
  // Exercise Library
  getExercises,
  getExercise,
  getRecommendedExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  // Workout Templates
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  // Workout Sessions
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  // Exercise Entries
  getExerciseEntries,
  createExerciseEntry,
  updateExerciseEntry,
  deleteExerciseEntry,
  // Analytics
  getAnalytics,
} from "../controllers/workout.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { TryCatch } from "../middlewares/error";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ===========================================
// EXERCISE LIBRARY ROUTES
// ===========================================
router.get("/exercises", TryCatch(getExercises));
router.get("/exercises/recommended", TryCatch(getRecommendedExercises));

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
router.get("/exercises/entries", TryCatch(getExerciseEntries));
router.post("/exercises/entries", TryCatch(createExerciseEntry));
router.put("/exercises/entries/:id", TryCatch(updateExerciseEntry));
router.delete("/exercises/entries/:id", TryCatch(deleteExerciseEntry));

// Parameterized routes (must come AFTER specific routes)
router.get("/exercises/:id", TryCatch(getExercise));
router.post("/exercises", TryCatch(createExercise));
router.put("/exercises/:id", TryCatch(updateExercise));
router.delete("/exercises/:id", TryCatch(deleteExercise));

// ===========================================
// WORKOUT TEMPLATE ROUTES
// ===========================================
router.get("/templates", TryCatch(getTemplates));
router.post("/templates", TryCatch(createTemplate));
router.put("/templates/:id", TryCatch(updateTemplate));
router.delete("/templates/:id", TryCatch(deleteTemplate));

// ===========================================
// WORKOUT SESSION ROUTES
// ===========================================
router.get("/sessions", TryCatch(getSessions));
router.get("/sessions/:id", TryCatch(getSession));
router.post("/sessions", TryCatch(createSession));
router.put("/sessions/:id", TryCatch(updateSession));
router.delete("/sessions/:id", TryCatch(deleteSession));

// ===========================================
// ANALYTICS ROUTES
// ===========================================
router.get("/analytics", TryCatch(getAnalytics));

export default router;

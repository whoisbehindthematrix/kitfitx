import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  // Scan Food (AI)
  scanFood,
  // Scanned Food
  getScannedFoods,
  createScannedFood,
  // Global Food (Admin)
  getGlobalFoods,
  createGlobalFood,
  updateGlobalFood,
  deleteGlobalFood,
  // Food Log
  createFoodLog,
  getFoodLogs,
  updateFoodLog,
  deleteFoodLog,
} from "../controllers/food.controller";
import { TryCatch } from "../middlewares/error";
import multer from "multer";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// ===========================================
// SCAN FOOD (AI Analysis)
// ===========================================
router.post("/scan", authMiddleware, upload.single("image"), TryCatch(scanFood));

// ===========================================
// SCANNED FOOD ROUTES
// ===========================================
router.get("/scanned", authMiddleware, TryCatch(getScannedFoods));
router.post("/scanned", authMiddleware, TryCatch(createScannedFood));

// ===========================================
// GLOBAL FOOD ROUTES
// ===========================================
// Public read (no auth required for browsing)
router.get("/global", TryCatch(getGlobalFoods));
// Admin only for create/update/delete
router.post("/global", authMiddleware, TryCatch(createGlobalFood));
router.patch("/global/:id", authMiddleware, TryCatch(updateGlobalFood));
router.delete("/global/:id", authMiddleware, TryCatch(deleteGlobalFood));

// ===========================================
// FOOD LOG ROUTES
// ===========================================
router.post("/log", authMiddleware, TryCatch(createFoodLog));
router.get("/log", authMiddleware, TryCatch(getFoodLogs));
router.patch("/log/:id", authMiddleware, TryCatch(updateFoodLog));
router.delete("/log/:id", authMiddleware, TryCatch(deleteFoodLog));

export default router;

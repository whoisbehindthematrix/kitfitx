"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const food_controller_1 = require("../controllers/food.controller");
const error_1 = require("../middlewares/error");
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
// ===========================================
// SCAN FOOD (AI Analysis)
// ===========================================
router.post("/scan", auth_middleware_1.authMiddleware, upload.single("image"), (0, error_1.TryCatch)(food_controller_1.scanFood));
// ===========================================
// SCANNED FOOD ROUTES
// ===========================================
router.get("/scanned", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(food_controller_1.getScannedFoods));
router.post("/scanned", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(food_controller_1.createScannedFood));
// ===========================================
// GLOBAL FOOD ROUTES
// ===========================================
// Public read (no auth required for browsing)
router.get("/global", (0, error_1.TryCatch)(food_controller_1.getGlobalFoods));
// Admin only for create/update/delete
router.post("/global", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(food_controller_1.createGlobalFood));
router.patch("/global/:id", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(food_controller_1.updateGlobalFood));
router.delete("/global/:id", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(food_controller_1.deleteGlobalFood));
// ===========================================
// FOOD LOG ROUTES
// ===========================================
router.post("/log", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(food_controller_1.createFoodLog));
router.get("/log", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(food_controller_1.getFoodLogs));
router.patch("/log/:id", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(food_controller_1.updateFoodLog));
router.delete("/log/:id", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(food_controller_1.deleteFoodLog));
exports.default = router;

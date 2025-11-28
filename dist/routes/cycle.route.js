"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const error_1 = require("../middlewares/error");
const cycle_controllers_1 = require("../controllers/cycle.controllers");
const router = express_1.default.Router();
// Cycle entry routes
router.post("/", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(cycle_controllers_1.addCycleEntry));
router.get("/", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(cycle_controllers_1.getCycleEntries));
// Quick notes routes
router.get("/quick-notes", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(cycle_controllers_1.getQuickNotes));
router.post("/quick-notes", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(cycle_controllers_1.createQuickNote));
router.put("/quick-notes/:id", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(cycle_controllers_1.updateQuickNote));
router.delete("/quick-notes/:id", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(cycle_controllers_1.deleteQuickNote));
router.post("/quick-notes/sync", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(cycle_controllers_1.syncQuickNotes));
exports.default = router;

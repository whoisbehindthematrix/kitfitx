"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const profile_controller_1 = require("../controllers/profile.controller");
const error_1 = require("../middlewares/error");
const router = express_1.default.Router();
// Single route to create or update profile (idempotent upsert)
router.put("/", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(profile_controller_1.upsertProfile));
router.get("/", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(profile_controller_1.getProfile));
exports.default = router;

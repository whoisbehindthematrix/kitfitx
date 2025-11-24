"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const error_1 = require("../middlewares/error");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.post("/register", (0, error_1.TryCatch)(auth_controller_1.register));
router.post("/login", (0, error_1.TryCatch)(auth_controller_1.login));
router.post("/token/refresh", (0, error_1.TryCatch)(auth_controller_1.refreshToken));
router.post("/logout", (0, error_1.TryCatch)(auth_controller_1.logout));
// Protected routes
router.post("/sync", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(auth_controller_1.syncUser));
router.get("/me", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(auth_controller_1.getCurrentUser));
router.put("/me", auth_middleware_1.authMiddleware, (0, error_1.TryCatch)(auth_controller_1.updateCurrentUser));
exports.default = router;

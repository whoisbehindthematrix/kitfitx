import { Router } from "express";
import { 
  register, 
  login, 
  refreshToken, 
  logout, 
  syncUser, 
  getCurrentUser, 
  updateCurrentUser,
  forgotPassword,
  resetPassword,
  updatePassword
} from "../controllers/auth.controller";
import { TryCatch } from "../middlewares/error";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Public routes
router.post("/register", TryCatch(register));
router.post("/login", TryCatch(login));
router.post("/token/refresh", TryCatch(refreshToken));
router.post("/logout", TryCatch(logout));
router.post("/forgot-password", TryCatch(forgotPassword));
router.post("/reset-password", TryCatch(resetPassword));

// Protected routes
router.post("/sync", authMiddleware, TryCatch(syncUser));
router.get("/me", authMiddleware, TryCatch(getCurrentUser));
router.put("/me", authMiddleware, TryCatch(updateCurrentUser));
router.put("/change-password", authMiddleware, TryCatch(updatePassword));

export default router;

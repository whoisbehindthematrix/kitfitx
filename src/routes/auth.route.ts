import express from "express";
import { verifySupabaseToken } from "../middlewares/auth.middleware";
import { register, login, syncUser, getAllUsers } from "../controllers/auth.controller";
import { TryCatch } from "../middlewares/error";

const router = express.Router();

// Public routes
router.post("/register", TryCatch(register));
router.post("/login", TryCatch(login));

// Protected routes (require Supabase token)
router.post("/sync", verifySupabaseToken, TryCatch(syncUser));
router.get("/admin/users", verifySupabaseToken, TryCatch(getAllUsers));

export default router;
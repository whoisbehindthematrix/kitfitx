import express from "express";
import { verifySupabaseToken } from "../middlewares/auth.middleware";
import { addCycleEntry, getCycleEntries } from "../controllers/cycle.controllers";

const router = express.Router();
router.post("/", verifySupabaseToken, addCycleEntry);
router.get("/", verifySupabaseToken, getCycleEntries);

export default router;

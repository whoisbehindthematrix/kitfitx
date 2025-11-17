import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { addCycleEntry, getCycleEntries } from "../controllers/cycle.controllers";
const router = express.Router();
router.post("/", authMiddleware, addCycleEntry);
router.get("/", authMiddleware, getCycleEntries);
export default router;

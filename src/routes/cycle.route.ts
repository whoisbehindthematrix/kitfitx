import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { TryCatch } from "../middlewares/error";
import { 
  addCycleEntry, 
  getCycleEntries,
  getQuickNotes,
  createQuickNote,
  updateQuickNote,
  deleteQuickNote,
  syncQuickNotes,
  deleteCycleEntryById,
  deleteCycleEntries
} from "../controllers/cycle.controllers";

const router = express.Router();

// Cycle entry routes
router.post("/", authMiddleware, TryCatch(addCycleEntry));
router.get("/", authMiddleware, TryCatch(getCycleEntries));
router.delete("/bulk", authMiddleware, TryCatch(deleteCycleEntries));
router.delete("/:id", authMiddleware, TryCatch(deleteCycleEntryById));

// Quick notes routes
router.get("/quick-notes", authMiddleware, TryCatch(getQuickNotes));
router.post("/quick-notes", authMiddleware, TryCatch(createQuickNote));
router.put("/quick-notes/:id", authMiddleware, TryCatch(updateQuickNote));
router.delete("/quick-notes/:id", authMiddleware, TryCatch(deleteQuickNote));
router.post("/quick-notes/sync", authMiddleware, TryCatch(syncQuickNotes));

export default router;

import express from "express";
   import multer from "multer";
   import { verifySupabaseToken } from "@/middlewares/auth.middleware";
   import { scanFood } from "@/controllers/food.controller";

   const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
   const router = express.Router();

   router.post(
     "/scan",
     verifySupabaseToken,
     upload.single("photo"),
     scanFood
   );

   export default router;
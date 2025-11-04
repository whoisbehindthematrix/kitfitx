// src/middlewares/verifySupabaseToken.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface SupabaseUserPayload {
  sub: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

// Note: We avoid global namespace augmentation to satisfy lint rules.

export const verifySupabaseToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        error: "No token provided" 
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: "Invalid token format. Use: Bearer <token>" 
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.SUPABASE_JWT_SECRET as string
    ) as SupabaseUserPayload;

    const reqWithUser = req as unknown as { user?: unknown };
    reqWithUser.user = decoded as unknown;
    next();
  } catch (err) {
    console.error("JWT Error:", err);
    return res.status(401).json({ 
      success: false,
      error: "Invalid or expired token" 
    });
  }
};
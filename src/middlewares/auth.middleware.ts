import { createRemoteJWKSet, jwtVerify } from "jose";
import { Request, Response, NextFunction } from "express";

const JWKS = createRemoteJWKSet(
  new URL(process.env.SUPABASE_JWT_KEY as string)
);

export interface SupabaseUserPayload {
  sub: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

declare global {
  namespace Express {
    interface Request {
      user?: SupabaseUserPayload;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  try {
    const header: string = (req.headers.authorization ?? "") as string;
    const token: string = header.replace("Bearer ", "");

    // console.log("Auth Middleware - Token:", token, JWKS);

    if (!token) return res.status(401).json({ error: "Missing token" });

    const { payload } = (await jwtVerify(token, JWKS)) as {
      payload: SupabaseUserPayload;
    };

    req.user = {
      sub: payload.sub,
      email: payload.email,
      user_metadata: payload.user_metadata || {},
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}






// // src/middlewares/auth.middleware.ts
// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";

// export interface SupabaseUserPayload {
//   sub: string;
//   email?: string;
//   user_metadata?: Record<string, unknown>;
// }

// // Extend Express Request to include Supabase user
// declare global {
//   namespace Express {
//     interface Request {
//       user?: SupabaseUserPayload;
//     }
//   }
// }

// export const verifySupabaseToken = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//       return res.status(401).json({ 
//         success: false,
//         error: "No token provided" 
//       });
//     }

//     const token = authHeader.split(" ")[1];
//     if (!token) {
//       return res.status(401).json({ 
//         success: false,
//         error: "Invalid token format. Use: Bearer <token>" 
//       });
//     }

//     const decoded = jwt.verify(
//       token,
//       process.env.SUPABASE_JWT_SECRET as string
//     ) as SupabaseUserPayload;

//     req.user = decoded;
//     next();
//   } catch (err) {
//     console.error("JWT Error:", err);
//     return res.status(401).json({ 
//       success: false,
//       error: "Invalid or expired token" 
//     });
//   }
// };

// // Alias for backward compatibility
// export const authMiddleware = verifySupabaseToken;
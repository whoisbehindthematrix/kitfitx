import { Request, Response } from "express";
import prisma from "../lib/prismaClient";
import { createClient } from "@supabase/supabase-js";
import ErrorHandler from "@/utils/errorHandler.js";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // For admin operations
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!; // For client operations

// Admin client (has service role key - bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Public client (for regular operations)
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      throw new ErrorHandler("Email and password are required", 400);
    }

    // Register user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for testing
        user_metadata: {
          full_name: displayName || email.split("@")[0],
        },
      });

    if (authError) {
      throw new ErrorHandler(authError.message || "Registration failed", 400);
    }

    if (!authData.user) {
      throw new ErrorHandler("Failed to create user", 500);
    }

    // Ensure the ID is a string and role matches enum
    const userId = String(authData.user.id);
    const userEmail = authData.user.email || email;

    // Sync user to your database
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: userEmail,
        displayName: displayName || authData.user.user_metadata?.full_name || null,
        avatarUrl: authData.user.user_metadata?.avatar_url || null,
      },
      create: {
        id: userId,
        email: userEmail,
        displayName: displayName || authData.user.user_metadata?.full_name || null,
        avatarUrl: authData.user.user_metadata?.avatar_url || null,
        role: "USER", // Ensure this matches the Role enum exactly
      },
      include: { profile: true },
    });

    // Create profile if it doesn't exist
    if (!user.profile) {
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          gender: authData.user.user_metadata?.gender || "female",
        },
      });
    }

    // Remove the unused generateLink call
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    // Ensure proper error handling
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Registration failed",
      500
    );
  }
};

// Login user - similar fixes
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ErrorHandler("Email and password are required", 400);
    }

    // Sign in with Supabase
    const { data: authData, error: authError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      throw new ErrorHandler(authError.message || "Invalid credentials", 401);
    }

    if (!authData.user || !authData.session) {
      throw new ErrorHandler("Login failed", 500);
    }

    // Ensure proper data types
    const userId = String(authData.user.id);
    const userEmail = authData.user.email || email;

    // Sync user to your database
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: userEmail,
        displayName:
          authData.user.user_metadata?.full_name ||
          authData.user.email?.split("@")[0] ||
          null,
        avatarUrl: authData.user.user_metadata?.avatar_url || null,
      },
      create: {
        id: userId,
        email: userEmail,
        displayName:
          authData.user.user_metadata?.full_name ||
          authData.user.email?.split("@")[0] ||
          null,
        avatarUrl: authData.user.user_metadata?.avatar_url || null,
        role: "USER",
      },
      include: { profile: true },
    });

    // Create profile if it doesn't exist
    if (!user.profile) {
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          gender: authData.user.user_metadata?.gender || "female",
        },
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        expires_in: authData.session.expires_in,
      },
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Login failed",
      500
    );
  }
};

// Existing syncUser function
export const syncUser = async (req: Request, res: Response) => {
  try {
    const { sub: userId, email, user_metadata } = req.user!;

    const displayName = user_metadata?.full_name || user_metadata?.name;
    const avatarUrl = user_metadata?.avatar_url || null;

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: { email, displayName, avatarUrl },
      create: {
        id: userId,
        email,
        displayName,
        avatarUrl,
      },
      include: { profile: true },
    });

    if (!user.profile) {
      await prisma.userProfile.create({
        data: {
          userId,
          gender: user_metadata?.gender || "female",
        },
      });
    }

    res.json({ message: "User synced successfully", user });
  } catch (err) {
    console.error("Sync Error:", err);
    res.status(500).json({ error: "Failed to sync user" });
  }
};

// Admin: Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // Check if user is admin (from middleware)
    const { sub: userId } = req.user!;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ErrorHandler("Unauthorized: Admin access required", 403);
    }

    // Get all users with pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              fullName: true,
              gender: true,
              dateOfBirth: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.user.count(),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to fetch users",
      500
    );
  }
};

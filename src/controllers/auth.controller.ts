import { Request, Response } from "express";
import prisma from "../lib/prismaClient";
import { Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import ErrorHandler from "@/utils/errorHandler.js";
import { updateProfileSchema } from "../validation/profileSchemas.validation.js";

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
        displayName:
          displayName || authData.user.user_metadata?.full_name || null,
        avatarUrl: authData.user.user_metadata?.avatar_url || null,
      },
      create: {
        id: userId,
        email: userEmail,
        displayName:
          displayName || authData.user.user_metadata?.full_name || null,
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

    // Refetch user with profile to get onboardingCompleted
    const userWithProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });

    if (!userWithProfile) {
      throw new ErrorHandler("Failed to fetch user profile", 500);
    }

    // Auto-login user after registration: sign in with the provided credentials
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

    if (sessionError || !sessionData.session) {
      // If auto-login fails, still return user but without session tokens
      // User can login manually afterward
      console.warn("Auto-login after registration failed:", sessionError);
      return res.status(201).json({
        success: true,
        message: "User registered successfully. Please login to continue.",
        user: {
          id: userWithProfile.id,
          email: userWithProfile.email,
          displayName: userWithProfile.displayName,
          avatarUrl: userWithProfile.avatarUrl,
          onboardingCompleted: userWithProfile.profile?.onboardingCompleted ?? false,
        },
      });
    }

    // Registration successful with auto-login
    res.status(201).json({
      success: true,
      message: "User registered and logged in successfully",
      user: {
        id: userWithProfile.id,
        email: userWithProfile.email,
        displayName: userWithProfile.displayName,
        avatarUrl: userWithProfile.avatarUrl,
        onboardingCompleted: userWithProfile.profile?.onboardingCompleted ?? false,
      },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
        expires_in: sessionData.session.expires_in,
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

    // Refetch user with profile to get onboardingCompleted
    const userWithProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });

    if (!userWithProfile) {
      throw new ErrorHandler("Failed to fetch user profile", 500);
    }

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: userWithProfile.id,
        email: userWithProfile.email,
        displayName: userWithProfile.displayName,
        avatarUrl: userWithProfile.avatarUrl,
        onboardingCompleted: userWithProfile.profile?.onboardingCompleted ?? false,
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
		const user = req.user;
		if (!user || !user.sub) {
			throw new ErrorHandler('User not authenticated', 401);
		}

		const userId = user.sub;
		const userEmail = user.email || null;

		const displayName =
			(user.user_metadata?.full_name as string | undefined) ||
			(user.user_metadata?.name as string | undefined) ||
			(userEmail?.split('@')[0] ?? null);

		const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) || null;
		const gender = (user.user_metadata?.gender as string | undefined) || 'female';

		// Upsert user (no nested profile to keep it clear)
		await prisma.user.upsert({
			where: { id: userId },
			update: { email: userEmail, displayName, avatarUrl },
			create: { id: userId, email: userEmail, displayName, avatarUrl },
		});

		// Ensure profile exists
		const existingProfile = await prisma.userProfile.findUnique({ where: { userId } });
		if (!existingProfile) {
			await prisma.userProfile.create({ data: { userId, gender } });
		}

		// Update lastSyncedAt
		await prisma.userProfile.updateMany({
			where: { userId },
			data: { lastSyncedAt: new Date() },
		});

		// Refetch user with profile for accurate response
		const fullUser = await prisma.user.findUnique({
			where: { id: userId },
			include: { profile: true },
		});
		if (!fullUser) throw new ErrorHandler('User not found after sync', 500);

		return res.json({
			success: true,
			message: 'User synced successfully',
			user: {
				id: fullUser.id,
				email: fullUser.email,
				displayName: fullUser.displayName,
				avatarUrl: fullUser.avatarUrl,
				profile: fullUser.profile, // matches app expectation
				onboardingCompleted: fullUser.profile?.onboardingCompleted ?? false,
			},
		});
	} catch (err) {
		if (err instanceof ErrorHandler) throw err;
		throw new ErrorHandler(
			err instanceof Error ? err.message : 'Failed to sync user',
			500
		);
	}
};

// Refresh access token using refresh token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new ErrorHandler("Refresh token is required", 400);
    }

    // Use Supabase to refresh the session
    const { data, error } = await supabaseClient.auth.refreshSession({
      refresh_token,
    });

    console.log("Refresh token response:", { data, error }, refresh_token);

    if (error || !data.session) {
      throw new ErrorHandler("Failed to refresh token", 401);
    }

    res.json({
      success: true,
      message: "Token refreshed successfully",
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
      },
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Token refresh failed",
      500
    );
  }
};

// Logout user (invalidate session in Supabase)
export const logout = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.sub) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    // Supabase doesn't support server-side token revocation directly.
    // Tokens remain valid until they expire (security trade-off).
    // For enhanced security, implement a token blacklist in your database.

    // Example audit logging (future enhancement):
    // const userId = user.sub;
    // await logAuditEvent(userId, 'LOGOUT', req.ip);

    res.json({
      success: true,
      message: "Logged out successfully. Clear tokens from client storage.",
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Logout failed",
      500
    );
  }
};

// Verify email (for email confirmation flow)
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ErrorHandler("Verification token is required", 400);
    }

    // Verify the token via Supabase (this is typically handled client-side or via email link)
    // For now, we'll just acknowledge the endpoint exists
    res.json({
      success: true,
      message: "Email verification handled. Please confirm via email link.",
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Email verification failed",
      500
    );
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

// Get current user with full profile
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.sub) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    const userId = user.sub;

    const fullUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!fullUser) {
      throw new ErrorHandler("User not found", 404);
    }

    res.json({
      success: true,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        displayName: fullUser.displayName,
        avatarUrl: fullUser.avatarUrl,
        profile: fullUser.profile,
        onboardingCompleted: fullUser.profile?.onboardingCompleted ?? false,
      },
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to fetch user",
      500
    );
  }
};

// Update current user profile
export const updateCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.sub) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    const userId = user.sub;

    // Parse and validate incoming profile fields
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ErrorHandler(
        "Invalid profile payload: " + parseResult.error.issues.map((e: { message: string }) => e.message).join(", "),
        400
      );
    }

    const profileData = parseResult.data;

    // Ensure base user exists
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new ErrorHandler("User not found", 404);
    }

    // Prepare profile data for update (convert date strings to Date objects)
    const updateData: Record<string, unknown> = {};
    if (profileData.dateOfBirth) {
      updateData.dateOfBirth = new Date(profileData.dateOfBirth);
    }
    if (profileData.lastPeriodStart) {
      updateData.lastPeriodStart = new Date(profileData.lastPeriodStart);
    }

    // Copy other fields (excluding dates and JSON)
    Object.entries(profileData).forEach(([key, value]) => {
      if (key !== "dateOfBirth" && key !== "lastPeriodStart" && key !== "notifications" && value !== undefined) {
        updateData[key] = value;
      }
    });

    // Handle notifications JSON field separately
    if (profileData.notifications !== undefined) {
      updateData.notifications = profileData.notifications as Prisma.InputJsonValue;
    }

    // Update lastSyncedAt
    updateData.lastSyncedAt = new Date();

    // Upsert profile
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });

    console.log("profile", profile);

    // Refetch user with profile for response
    const fullUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!fullUser) {
      throw new ErrorHandler("Failed to fetch updated user", 500);
    }

    res.json({
      success: true,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        displayName: fullUser.displayName,
        avatarUrl: fullUser.avatarUrl,
        profile: fullUser.profile,
        onboardingCompleted: fullUser.profile?.onboardingCompleted ?? false,
      },
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to update user",
      500
    );
  }
};

// Request password reset (sends email via Supabase)
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ErrorHandler("Email is required", 400);
    }

    // Use Supabase to send password reset email
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${frontendUrl}/reset-password`,
      }
    );

    console.log("data", data);

    if (error) {
      // Don't reveal if email exists - always return success message
      console.error("Password reset error:", error);
    }

    // Always return success (security best practice - don't reveal if email exists)
    res.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to process password reset request",
      500
    );
  }
};

// Reset password with token from email link
// Note: This is typically handled client-side after user clicks email link
// The token exchange happens automatically via Supabase client
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { password, token } = req.body;

    if (!password) {
      throw new ErrorHandler("Password is required", 400);
    }

    if (password.length < 6) {
      throw new ErrorHandler("Password must be at least 6 characters", 400);
    }

    // For server-side reset, we need to verify the token first
    // However, Supabase handles this client-side via the email link
    // This endpoint is for cases where you want server-side validation
    
    // If token is provided, we can use it to verify the session
    // But typically, the user should already have a session from clicking the email link
    if (token) {
      // Verify token and create session (this is usually done client-side)
      const { data: sessionData, error: sessionError } = 
        await supabaseClient.auth.getSession();

      if (sessionError || !sessionData.session) {
        throw new ErrorHandler(
          "Invalid or expired reset token. Please request a new password reset.",
          400
        );
      }
    }

    // Update password using admin API (requires valid session)
    // Note: In practice, this is better handled client-side after Supabase redirect
    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: password,
    });

    if (updateError) {
      throw new ErrorHandler(
        updateError.message || "Failed to update password",
        400
      );
    }

    res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to reset password",
      500
    );
  }
};

// Update password when user is authenticated (change password)
export const updatePassword = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.sub) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ErrorHandler("Current password and new password are required", 400);
    }

    if (newPassword.length < 6) {
      throw new ErrorHandler("New password must be at least 6 characters", 400);
    }

    // Get user email from database
    const userRecord = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { email: true },
    });

    if (!userRecord || !userRecord.email) {
      throw new ErrorHandler("User not found", 404);
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabaseClient.auth.signInWithPassword({
      email: userRecord.email,
      password: currentPassword,
    });

    if (verifyError) {
      throw new ErrorHandler("Current password is incorrect", 401);
    }

    // Update password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.sub,
      { password: newPassword }
    );

    if (updateError) {
      throw new ErrorHandler(
        updateError.message || "Failed to update password",
        400
      );
    }

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to update password",
      500
    );
  }
};

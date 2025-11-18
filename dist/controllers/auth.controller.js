"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = exports.verifyEmail = exports.logout = exports.refreshToken = exports.syncUser = exports.login = exports.register = void 0;
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
const supabase_js_1 = require("@supabase/supabase-js");
const errorHandler_js_1 = __importDefault(require("../utils/errorHandler.js"));
// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // For admin operations
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // For client operations
// Admin client (has service role key - bypasses RLS)
const supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
// Public client (for regular operations)
const supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
const register = async (req, res) => {
    try {
        const { email, password, displayName } = req.body;
        if (!email || !password) {
            throw new errorHandler_js_1.default("Email and password are required", 400);
        }
        // Register user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email for testing
            user_metadata: {
                full_name: displayName || email.split("@")[0],
            },
        });
        if (authError) {
            throw new errorHandler_js_1.default(authError.message || "Registration failed", 400);
        }
        if (!authData.user) {
            throw new errorHandler_js_1.default("Failed to create user", 500);
        }
        // Ensure the ID is a string and role matches enum
        const userId = String(authData.user.id);
        const userEmail = authData.user.email || email;
        // Sync user to your database
        const user = await prismaClient_1.default.user.upsert({
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
            await prismaClient_1.default.userProfile.create({
                data: {
                    userId: user.id,
                    gender: authData.user.user_metadata?.gender || "female",
                },
            });
        }
        // Auto-login user after registration: sign in with the provided credentials
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
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
                    id: user.id,
                    email: user.email,
                    displayName: user.displayName,
                    role: user.role,
                },
            });
        }
        // Registration successful with auto-login
        res.status(201).json({
            success: true,
            message: "User registered and logged in successfully",
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                role: user.role,
            },
            session: {
                access_token: sessionData.session.access_token,
                refresh_token: sessionData.session.refresh_token,
                expires_at: sessionData.session.expires_at,
                expires_in: sessionData.session.expires_in,
            },
        });
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        // Ensure proper error handling
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Registration failed", 500);
    }
};
exports.register = register;
// Login user - similar fixes
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new errorHandler_js_1.default("Email and password are required", 400);
        }
        // Sign in with Supabase
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });
        if (authError) {
            throw new errorHandler_js_1.default(authError.message || "Invalid credentials", 401);
        }
        if (!authData.user || !authData.session) {
            throw new errorHandler_js_1.default("Login failed", 500);
        }
        // Ensure proper data types
        const userId = String(authData.user.id);
        const userEmail = authData.user.email || email;
        // Sync user to your database
        const user = await prismaClient_1.default.user.upsert({
            where: { id: userId },
            update: {
                email: userEmail,
                displayName: authData.user.user_metadata?.full_name ||
                    authData.user.email?.split("@")[0] ||
                    null,
                avatarUrl: authData.user.user_metadata?.avatar_url || null,
            },
            create: {
                id: userId,
                email: userEmail,
                displayName: authData.user.user_metadata?.full_name ||
                    authData.user.email?.split("@")[0] ||
                    null,
                avatarUrl: authData.user.user_metadata?.avatar_url || null,
                role: "USER",
            },
            include: { profile: true },
        });
        // Create profile if it doesn't exist
        if (!user.profile) {
            await prismaClient_1.default.userProfile.create({
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
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Login failed", 500);
    }
};
exports.login = login;
// Existing syncUser function
const syncUser = async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.sub) {
            throw new errorHandler_js_1.default('User not authenticated', 401);
        }
        const userId = user.sub;
        const userEmail = user.email || null;
        const displayName = user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (userEmail?.split('@')[0] ?? null);
        const avatarUrl = user.user_metadata?.avatar_url || null;
        const gender = user.user_metadata?.gender || 'female';
        // Upsert user (no nested profile to keep it clear)
        await prismaClient_1.default.user.upsert({
            where: { id: userId },
            update: { email: userEmail, displayName, avatarUrl },
            create: { id: userId, email: userEmail, displayName, avatarUrl },
        });
        // Ensure profile exists
        const existingProfile = await prismaClient_1.default.userProfile.findUnique({ where: { userId } });
        if (!existingProfile) {
            await prismaClient_1.default.userProfile.create({ data: { userId, gender } });
        }
        // Refetch user with profile for accurate response
        const fullUser = await prismaClient_1.default.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });
        if (!fullUser)
            throw new errorHandler_js_1.default('User not found after sync', 500);
        return res.json({
            success: true,
            message: 'User synced successfully',
            user: {
                id: fullUser.id,
                email: fullUser.email,
                displayName: fullUser.displayName,
                avatarUrl: fullUser.avatarUrl,
                profile: fullUser.profile, // matches app expectation
            },
        });
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default)
            throw err;
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : 'Failed to sync user', 500);
    }
};
exports.syncUser = syncUser;
// Refresh access token using refresh token
const refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            throw new errorHandler_js_1.default("Refresh token is required", 400);
        }
        // Use Supabase to refresh the session
        const { data, error } = await supabaseClient.auth.refreshSession({
            refresh_token,
        });
        console.log("Refresh token response:", { data, error }, refresh_token);
        if (error || !data.session) {
            throw new errorHandler_js_1.default("Failed to refresh token", 401);
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
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Token refresh failed", 500);
    }
};
exports.refreshToken = refreshToken;
// Logout user (invalidate session in Supabase)
const logout = async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.sub) {
            throw new errorHandler_js_1.default("User not authenticated", 401);
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
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Logout failed", 500);
    }
};
exports.logout = logout;
// Verify email (for email confirmation flow)
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            throw new errorHandler_js_1.default("Verification token is required", 400);
        }
        // Verify the token via Supabase (this is typically handled client-side or via email link)
        // For now, we'll just acknowledge the endpoint exists
        res.json({
            success: true,
            message: "Email verification handled. Please confirm via email link.",
        });
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Email verification failed", 500);
    }
};
exports.verifyEmail = verifyEmail;
// Admin: Get all users
const getAllUsers = async (req, res) => {
    try {
        // Check if user is admin (from middleware)
        const { sub: userId } = req.user;
        const currentUser = await prismaClient_1.default.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (!currentUser || currentUser.role !== "ADMIN") {
            throw new errorHandler_js_1.default("Unauthorized: Admin access required", 403);
        }
        // Get all users with pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            prismaClient_1.default.user.findMany({
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
            prismaClient_1.default.user.count(),
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
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Failed to fetch users", 500);
    }
};
exports.getAllUsers = getAllUsers;

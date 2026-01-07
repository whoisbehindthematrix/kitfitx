"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFoodLog = exports.updateFoodLog = exports.getFoodLogs = exports.createFoodLog = exports.deleteGlobalFood = exports.updateGlobalFood = exports.createGlobalFood = exports.getGlobalFoods = exports.createScannedFood = exports.getScannedFoods = exports.scanFood = void 0;
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const generative_ai_1 = require("@google/generative-ai");
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
const foodSchemas_validation_1 = require("../validation/foodSchemas.validation");
const gemini = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelId = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
// Default image URL for global foods when no image is provided
const DEFAULT_FOOD_IMAGE_URL = "https://img.freepik.com/free-vector/hand-drawn-thai-food-illustration_23-2149286342.jpg?ga=GA1.1.1022337787.1763629627&semt=ais_hybrid&w=740&q=80";
// Helper function to get image URL with default fallback
function getFoodImageUrl(imageUrl) {
    return imageUrl && imageUrl.trim() !== "" ? imageUrl : DEFAULT_FOOD_IMAGE_URL;
}
// ===========================================
// SCAN FOOD (AI Analysis)
// ===========================================
const scanFood = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    const file = req.file;
    const { prompt, saveToScannedFood } = req.body;
    if (!file) {
        throw new errorHandler_1.default("No image uploaded", 400);
    }
    if (!process.env.GEMINI_API_KEY) {
        throw new errorHandler_1.default("Gemini API not configured", 500);
    }
    // Convert photo buffer → base64 for Gemini
    const base64Image = file.buffer.toString("base64");
    const model = gemini.getGenerativeModel({ model: modelId });
    const promptText = prompt ?? "Identify the food and give calories, macros, and key nutrients.";
    // Enhanced prompt to ensure JSON-only response
    const jsonPrompt = `${promptText} 

IMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after the JSON.
The JSON must have exactly these fields:
- food_name (string)
- calories (number)
- protein_grams (number)
- fat_grams (number)
- carbs_grams (number)
- notes (string or null)

Example format:
{
  "food_name": "Chicken Salad",
  "calories": 320,
  "protein_grams": 25.5,
  "fat_grams": 12.3,
  "carbs_grams": 18.2,
  "notes": "Fresh salad with grilled chicken"
}`;
    const result = await model.generateContent([
        {
            inlineData: {
                mimeType: file.mimetype,
                data: base64Image,
            },
        },
        { text: jsonPrompt },
    ]);
    const output = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!output) {
        throw new errorHandler_1.default("Gemini response empty", 502);
    }
    // Parse Gemini response with multiple strategies
    let parsed;
    try {
        // Strategy 1: Try direct JSON parse (if response is pure JSON)
        try {
            parsed = JSON.parse(output.trim());
        }
        catch {
            // Strategy 2: Remove markdown code blocks and try again
            const cleaned = output
                .replace(/```json\s*/g, "")
                .replace(/```\s*/g, "")
                .trim();
            // Strategy 3: Extract JSON object from text using regex
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
            else {
                // Strategy 4: Try to find JSON array or nested structures
                const anyJsonMatch = cleaned.match(/(\{|\[)[\s\S]*(\}|\])/);
                if (anyJsonMatch) {
                    parsed = JSON.parse(anyJsonMatch[0]);
                }
                else {
                    throw new Error("No JSON found in response");
                }
            }
        }
    }
    catch (error) {
        // Log the actual response for debugging
        console.error("Gemini JSON parse error. Raw output:", output);
        console.error("Parse error:", error);
        throw new errorHandler_1.default(`Gemini did not return valid JSON. Response: ${output.substring(0, 200)}...`, 502);
    }
    // Map Gemini response to our schema
    const scannedFoodData = {
        foodName: parsed.food_name || parsed.foodName || "Unknown Food",
        calories: parseInt(parsed.calories) || 0,
        proteinGrams: parseFloat(parsed.protein_grams || parsed.proteinGrams) || 0,
        fatGrams: parseFloat(parsed.fat_grams || parsed.fatGrams) || 0,
        carbsGrams: parseFloat(parsed.carbs_grams || parsed.carbsGrams) || 0,
        notes: parsed.notes || null,
        source: "AI",
    };
    // If saveToScannedFood is true, save to database
    let savedFood = null;
    if (saveToScannedFood === true || saveToScannedFood === "true") {
        try {
            savedFood = await prismaClient_1.default.scannedFood.create({
                data: {
                    userId,
                    ...scannedFoodData,
                },
            });
        }
        catch (error) {
            console.error("Error saving scanned food:", error);
            // Don't fail the request if save fails
        }
    }
    return res.status(200).json({
        success: true,
        data: {
            ...scannedFoodData,
            ...(savedFood && { id: savedFood.id, createdAt: savedFood.createdAt.toISOString() }),
        },
        saved: !!savedFood,
    });
};
exports.scanFood = scanFood;
// ===========================================
// SCANNED FOOD CONTROLLERS
// ===========================================
// GET /api/food/scanned - Get user's scanned foods
const getScannedFoods = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const scannedFoods = await prismaClient_1.default.scannedFood.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
    });
    res.status(200).json({
        success: true,
        data: scannedFoods.map((food) => ({
            ...food,
            createdAt: food.createdAt.toISOString(),
        })),
    });
};
exports.getScannedFoods = getScannedFoods;
// POST /api/food/scanned - Manually create scanned food
const createScannedFood = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    const parseResult = foodSchemas_validation_1.scannedFoodSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new errorHandler_1.default("Invalid scanned food payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    const scannedFood = await prismaClient_1.default.scannedFood.create({
        data: {
            userId,
            ...parseResult.data,
        },
    });
    res.status(201).json({
        success: true,
        data: {
            ...scannedFood,
            createdAt: scannedFood.createdAt.toISOString(),
        },
        message: "Scanned food saved successfully",
    });
};
exports.createScannedFood = createScannedFood;
// ===========================================
// GLOBAL FOOD CONTROLLERS (Admin Only)
// ===========================================
// GET /api/food/global - Get global foods (public read)
const getGlobalFoods = async (req, res) => {
    const category = req.query.category;
    const isActive = req.query.isActive !== "false"; // Default to true
    const where = {
        isActive: isActive === true,
    };
    if (category && ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(category)) {
        where.category = category;
    }
    const globalFoods = await prismaClient_1.default.globalFood.findMany({
        where,
        orderBy: { name: "asc" },
    });
    res.status(200).json({
        success: true,
        data: globalFoods.map((food) => ({
            ...food,
            imageUrl: getFoodImageUrl(food.imageUrl),
            createdAt: food.createdAt.toISOString(),
            updatedAt: food.updatedAt.toISOString(),
        })),
    });
};
exports.getGlobalFoods = getGlobalFoods;
// POST /api/food/global - Create global food (admin only)
const createGlobalFood = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    // Check if user is admin
    const userRecord = await prismaClient_1.default.user.findUnique({
        where: { id: user.sub },
        select: { role: true },
    });
    if (!userRecord || userRecord.role !== "ADMIN") {
        throw new errorHandler_1.default("Unauthorized: Admin access required", 403);
    }
    const parseResult = foodSchemas_validation_1.globalFoodSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new errorHandler_1.default("Invalid global food payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    const globalFood = await prismaClient_1.default.globalFood.create({
        data: {
            ...parseResult.data,
            createdBy: user.sub,
        },
    });
    res.status(201).json({
        success: true,
        data: {
            ...globalFood,
            imageUrl: getFoodImageUrl(globalFood.imageUrl),
            createdAt: globalFood.createdAt.toISOString(),
            updatedAt: globalFood.updatedAt.toISOString(),
        },
        message: "Global food created successfully",
    });
};
exports.createGlobalFood = createGlobalFood;
// PATCH /api/food/global/:id - Update global food (admin only)
const updateGlobalFood = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    // Check if user is admin
    const userRecord = await prismaClient_1.default.user.findUnique({
        where: { id: user.sub },
        select: { role: true },
    });
    if (!userRecord || userRecord.role !== "ADMIN") {
        throw new errorHandler_1.default("Unauthorized: Admin access required", 403);
    }
    const { id } = req.params;
    const parseResult = foodSchemas_validation_1.updateGlobalFoodSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new errorHandler_1.default("Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    const globalFood = await prismaClient_1.default.globalFood.update({
        where: { id },
        data: parseResult.data,
    });
    res.status(200).json({
        success: true,
        data: {
            ...globalFood,
            imageUrl: getFoodImageUrl(globalFood.imageUrl),
            createdAt: globalFood.createdAt.toISOString(),
            updatedAt: globalFood.updatedAt.toISOString(),
        },
        message: "Global food updated successfully",
    });
};
exports.updateGlobalFood = updateGlobalFood;
// DELETE /api/food/global/:id - Delete global food (admin only)
const deleteGlobalFood = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    // Check if user is admin
    const userRecord = await prismaClient_1.default.user.findUnique({
        where: { id: user.sub },
        select: { role: true },
    });
    if (!userRecord || userRecord.role !== "ADMIN") {
        throw new errorHandler_1.default("Unauthorized: Admin access required", 403);
    }
    const { id } = req.params;
    await prismaClient_1.default.globalFood.delete({
        where: { id },
    });
    res.status(200).json({
        success: true,
        message: "Global food deleted successfully",
    });
};
exports.deleteGlobalFood = deleteGlobalFood;
// ===========================================
// FOOD LOG CONTROLLERS
// ===========================================
// POST /api/food/log - Add food to daily log
const createFoodLog = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    const parseResult = foodSchemas_validation_1.foodLogSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new errorHandler_1.default("Invalid food log payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    const { date, globalFoodId, scannedFoodId, quantity } = parseResult.data;
    // Verify the food exists
    if (globalFoodId) {
        const globalFood = await prismaClient_1.default.globalFood.findUnique({
            where: { id: globalFoodId, isActive: true },
        });
        if (!globalFood) {
            throw new errorHandler_1.default("Global food not found or inactive", 404);
        }
    }
    if (scannedFoodId) {
        const scannedFood = await prismaClient_1.default.scannedFood.findUnique({
            where: { id: scannedFoodId, userId },
        });
        if (!scannedFood) {
            throw new errorHandler_1.default("Scanned food not found", 404);
        }
    }
    // Normalize date to start of day
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);
    const foodLog = await prismaClient_1.default.foodLog.create({
        data: {
            userId,
            date: logDate,
            globalFoodId: globalFoodId || null,
            scannedFoodId: scannedFoodId || null,
            quantity: quantity || 1,
        },
        include: {
            globalFood: true,
            scannedFood: true,
        },
    });
    res.status(201).json({
        success: true,
        data: {
            ...foodLog,
            date: foodLog.date.toISOString().split('T')[0],
            createdAt: foodLog.createdAt.toISOString(),
            globalFood: foodLog.globalFood ? {
                ...foodLog.globalFood,
                imageUrl: getFoodImageUrl(foodLog.globalFood.imageUrl),
                createdAt: foodLog.globalFood.createdAt.toISOString(),
                updatedAt: foodLog.globalFood.updatedAt.toISOString(),
            } : null,
            scannedFood: foodLog.scannedFood ? {
                ...foodLog.scannedFood,
                createdAt: foodLog.scannedFood.createdAt.toISOString(),
            } : null,
        },
        message: "Food added to log successfully",
    });
};
exports.createFoodLog = createFoodLog;
// GET /api/food/log - Get food logs
const getFoodLogs = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    const date = req.query.date;
    const where = { userId };
    if (date) {
        const logDate = new Date(date);
        logDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(logDate);
        nextDay.setDate(nextDay.getDate() + 1);
        where.date = {
            gte: logDate,
            lt: nextDay,
        };
    }
    const foodLogs = await prismaClient_1.default.foodLog.findMany({
        where,
        include: {
            globalFood: true,
            scannedFood: true,
        },
        orderBy: { createdAt: "desc" },
    });
    // Calculate totals if date is provided
    let totals = null;
    if (date) {
        totals = foodLogs.reduce((acc, log) => {
            const food = log.globalFood || log.scannedFood;
            if (food) {
                const multiplier = log.quantity;
                acc.totalCalories += food.calories * multiplier;
                acc.totalProtein += food.proteinGrams * multiplier;
                acc.totalFat += food.fatGrams * multiplier;
                acc.totalCarbs += food.carbsGrams * multiplier;
            }
            return acc;
        }, { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 });
    }
    res.status(200).json({
        success: true,
        data: {
            foodLogs: foodLogs.map((log) => ({
                ...log,
                date: log.date.toISOString().split('T')[0],
                createdAt: log.createdAt.toISOString(),
                globalFood: log.globalFood ? {
                    ...log.globalFood,
                    imageUrl: getFoodImageUrl(log.globalFood.imageUrl),
                    createdAt: log.globalFood.createdAt.toISOString(),
                    updatedAt: log.globalFood.updatedAt.toISOString(),
                } : null,
                scannedFood: log.scannedFood ? {
                    ...log.scannedFood,
                    createdAt: log.scannedFood.createdAt.toISOString(),
                } : null,
            })),
            ...(totals && { totals }),
        },
    });
};
exports.getFoodLogs = getFoodLogs;
// PATCH /api/food/log/:id - Update food log
const updateFoodLog = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    const { id } = req.params;
    const parseResult = foodSchemas_validation_1.updateFoodLogSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new errorHandler_1.default("Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
    }
    // Verify ownership
    const existingLog = await prismaClient_1.default.foodLog.findUnique({
        where: { id },
    });
    if (!existingLog || existingLog.userId !== userId) {
        throw new errorHandler_1.default("Food log not found", 404);
    }
    const updateData = {};
    if (parseResult.data.quantity !== undefined) {
        updateData.quantity = parseResult.data.quantity;
    }
    if (parseResult.data.date) {
        const logDate = new Date(parseResult.data.date);
        logDate.setHours(0, 0, 0, 0);
        updateData.date = logDate;
    }
    const foodLog = await prismaClient_1.default.foodLog.update({
        where: { id },
        data: updateData,
        include: {
            globalFood: true,
            scannedFood: true,
        },
    });
    res.status(200).json({
        success: true,
        data: {
            ...foodLog,
            date: foodLog.date.toISOString().split('T')[0],
            createdAt: foodLog.createdAt.toISOString(),
            globalFood: foodLog.globalFood ? {
                ...foodLog.globalFood,
                imageUrl: getFoodImageUrl(foodLog.globalFood.imageUrl),
                createdAt: foodLog.globalFood.createdAt.toISOString(),
                updatedAt: foodLog.globalFood.updatedAt.toISOString(),
            } : null,
            scannedFood: foodLog.scannedFood ? {
                ...foodLog.scannedFood,
                createdAt: foodLog.scannedFood.createdAt.toISOString(),
            } : null,
        },
        message: "Food log updated successfully",
    });
};
exports.updateFoodLog = updateFoodLog;
// DELETE /api/food/log/:id - Delete food log
const deleteFoodLog = async (req, res) => {
    const user = req.user;
    if (!user || !user.sub) {
        throw new errorHandler_1.default("User not authenticated", 401);
    }
    const userId = user.sub;
    const { id } = req.params;
    // Verify ownership
    const existingLog = await prismaClient_1.default.foodLog.findUnique({
        where: { id },
    });
    if (!existingLog || existingLog.userId !== userId) {
        throw new errorHandler_1.default("Food log not found", 404);
    }
    await prismaClient_1.default.foodLog.delete({
        where: { id },
    });
    res.status(200).json({
        success: true,
        message: "Food log deleted successfully",
    });
};
exports.deleteFoodLog = deleteFoodLog;

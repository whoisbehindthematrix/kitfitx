import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import ErrorHandler from "@/utils/errorHandler";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../lib/prismaClient";
import {
  scannedFoodSchema,
  globalFoodSchema,
  updateGlobalFoodSchema,
  foodLogSchema,
  updateFoodLogSchema,
} from "../validation/foodSchemas.validation";

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const modelId = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

// Default image URL for global foods when no image is provided
const DEFAULT_FOOD_IMAGE_URL = "https://img.freepik.com/free-vector/hand-drawn-thai-food-illustration_23-2149286342.jpg?ga=GA1.1.1022337787.1763629627&semt=ais_hybrid&w=740&q=80";

// Helper function to get image URL with default fallback
function getFoodImageUrl(imageUrl: string | null | undefined): string {
  return imageUrl && imageUrl.trim() !== "" ? imageUrl : DEFAULT_FOOD_IMAGE_URL;
}

// ===========================================
// SCAN FOOD (AI Analysis)
// ===========================================

export const scanFood = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const file = req.file;
  const { prompt, saveToScannedFood } = req.body;

  if (!file) {
    throw new ErrorHandler("No image uploaded", 400);
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new ErrorHandler("Gemini API not configured", 500);
  }

  // Convert photo buffer → base64 for Gemini
  const base64Image = file.buffer.toString("base64");

  const model = gemini.getGenerativeModel({ model: modelId });
  const promptText = prompt ?? "Identify the food and give calories, macros, and key nutrients.";

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: file.mimetype,
        data: base64Image,
      },
    },
    { text: promptText + " Respond as JSON with fields food_name, calories, protein_grams, fat_grams, carbs_grams, notes." },
  ]);

  const output = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!output) {
    throw new ErrorHandler("Gemini response empty", 502);
  }

  // Parse Gemini response
  const cleaned = output.replace(/```json|```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new ErrorHandler("Gemini did not return valid JSON", 502);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Gemini JSON parse error. Raw:", cleaned);
    throw new ErrorHandler("Gemini did not return valid JSON", 502);
  }

  // Map Gemini response to our schema
  const scannedFoodData = {
    foodName: parsed.food_name || parsed.foodName || "Unknown Food",
    calories: parseInt(parsed.calories) || 0,
    proteinGrams: parseFloat(parsed.protein_grams || parsed.proteinGrams) || 0,
    fatGrams: parseFloat(parsed.fat_grams || parsed.fatGrams) || 0,
    carbsGrams: parseFloat(parsed.carbs_grams || parsed.carbsGrams) || 0,
    notes: parsed.notes || null,
    source: "AI" as const,
  };

  // If saveToScannedFood is true, save to database
  let savedFood = null;
  if (saveToScannedFood === true || saveToScannedFood === "true") {
    try {
      savedFood = await prisma.scannedFood.create({
        data: {
          userId,
          ...scannedFoodData,
        },
      });
    } catch (error) {
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

// ===========================================
// SCANNED FOOD CONTROLLERS
// ===========================================

// GET /api/food/scanned - Get user's scanned foods
export const getScannedFoods = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const scannedFoods = await prisma.scannedFood.findMany({
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

// POST /api/food/scanned - Manually create scanned food
export const createScannedFood = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  const parseResult = scannedFoodSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid scanned food payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const scannedFood = await prisma.scannedFood.create({
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

// ===========================================
// GLOBAL FOOD CONTROLLERS (Admin Only)
// ===========================================

// GET /api/food/global - Get global foods (public read)
export const getGlobalFoods = async (req: Request, res: Response) => {
  const category = req.query.category as string;
  const isActive = req.query.isActive !== "false"; // Default to true

  const where: Prisma.GlobalFoodWhereInput = {
    isActive: isActive === true,
  };

  if (category && ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(category)) {
    where.category = category as "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  }

  const globalFoods = await prisma.globalFood.findMany({
    where,
    orderBy: { name: "asc" },
  });

  res.status(200).json({
    success: true,
    data: globalFoods.map((food: typeof globalFoods[0]) => ({
      ...food,
      imageUrl: getFoodImageUrl(food.imageUrl),
      createdAt: food.createdAt.toISOString(),
      updatedAt: food.updatedAt.toISOString(),
    })),
  });
};

// POST /api/food/global - Create global food (admin only)
export const createGlobalFood = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  // Check if user is admin
  const userRecord = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { role: true },
  });

  if (!userRecord || userRecord.role !== "ADMIN") {
    throw new ErrorHandler("Unauthorized: Admin access required", 403);
  }

  const parseResult = globalFoodSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid global food payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const globalFood = await prisma.globalFood.create({
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

// PATCH /api/food/global/:id - Update global food (admin only)
export const updateGlobalFood = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  // Check if user is admin
  const userRecord = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { role: true },
  });

  if (!userRecord || userRecord.role !== "ADMIN") {
    throw new ErrorHandler("Unauthorized: Admin access required", 403);
  }

  const { id } = req.params;
  const parseResult = updateGlobalFoodSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const globalFood = await prisma.globalFood.update({
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

// DELETE /api/food/global/:id - Delete global food (admin only)
export const deleteGlobalFood = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  // Check if user is admin
  const userRecord = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { role: true },
  });

  if (!userRecord || userRecord.role !== "ADMIN") {
    throw new ErrorHandler("Unauthorized: Admin access required", 403);
  }

  const { id } = req.params;

  await prisma.globalFood.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: "Global food deleted successfully",
  });
};

// ===========================================
// FOOD LOG CONTROLLERS
// ===========================================

// POST /api/food/log - Add food to daily log
export const createFoodLog = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;

  const parseResult = foodLogSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid food log payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  const { date, globalFoodId, scannedFoodId, quantity } = parseResult.data;

  // Verify the food exists
  if (globalFoodId) {
    const globalFood = await prisma.globalFood.findUnique({
      where: { id: globalFoodId, isActive: true },
    });
    if (!globalFood) {
      throw new ErrorHandler("Global food not found or inactive", 404);
    }
  }

  if (scannedFoodId) {
    const scannedFood = await prisma.scannedFood.findUnique({
      where: { id: scannedFoodId, userId },
    });
    if (!scannedFood) {
      throw new ErrorHandler("Scanned food not found", 404);
    }
  }

  // Normalize date to start of day
  const logDate = new Date(date);
  logDate.setHours(0, 0, 0, 0);

  const foodLog = await prisma.foodLog.create({
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

// GET /api/food/log - Get food logs
export const getFoodLogs = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const date = req.query.date as string;

  const where: Prisma.FoodLogWhereInput = { userId };

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

  const foodLogs = await prisma.foodLog.findMany({
    where,
    include: {
      globalFood: true,
      scannedFood: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate totals if date is provided
  let totals: { totalCalories: number; totalProtein: number; totalFat: number; totalCarbs: number } | null = null;
  if (date) {
    totals = foodLogs.reduce(
      (acc, log) => {
        const food = log.globalFood || log.scannedFood;
        if (food) {
          const multiplier = log.quantity;
          acc.totalCalories += food.calories * multiplier;
          acc.totalProtein += food.proteinGrams * multiplier;
          acc.totalFat += food.fatGrams * multiplier;
          acc.totalCarbs += food.carbsGrams * multiplier;
        }
        return acc;
      },
      { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 }
    );
  }

  res.status(200).json({
    success: true,
    data: {
      foodLogs: foodLogs.map((log: typeof foodLogs[0]) => ({
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

// PATCH /api/food/log/:id - Update food log
export const updateFoodLog = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const { id } = req.params;

  const parseResult = updateFoodLogSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ErrorHandler(
      "Invalid update payload: " + parseResult.error.issues.map((e) => e.message).join(", "),
      400
    );
  }

  // Verify ownership
  const existingLog = await prisma.foodLog.findUnique({
    where: { id },
  });

  if (!existingLog || existingLog.userId !== userId) {
    throw new ErrorHandler("Food log not found", 404);
  }

  const updateData: Prisma.FoodLogUpdateInput = {};
  if (parseResult.data.quantity !== undefined) {
    updateData.quantity = parseResult.data.quantity;
  }
  if (parseResult.data.date) {
    const logDate = new Date(parseResult.data.date);
    logDate.setHours(0, 0, 0, 0);
    updateData.date = logDate;
  }

  const foodLog = await prisma.foodLog.update({
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

// DELETE /api/food/log/:id - Delete food log
export const deleteFoodLog = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user || !user.sub) {
    throw new ErrorHandler("User not authenticated", 401);
  }

  const userId = user.sub;
  const { id } = req.params;

  // Verify ownership
  const existingLog = await prisma.foodLog.findUnique({
    where: { id },
  });

  if (!existingLog || existingLog.userId !== userId) {
    throw new ErrorHandler("Food log not found", 404);
  }

  await prisma.foodLog.delete({
    where: { id },
  });

  res.status(200).json({
    success: true,
    message: "Food log deleted successfully",
  });
};

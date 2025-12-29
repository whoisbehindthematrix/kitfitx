// Type definitions for food models

export type FoodCategory = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export type FoodSource = 'AI' | 'MANUAL';

// Scanned Food (AI result)
export interface ScannedFoodRequest {
  foodName: string;
  calories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  notes?: string;
  imageUrl?: string;
  source?: FoodSource;
}

export interface ScannedFoodResponse {
  id: string;
  userId: string;
  foodName: string;
  calories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  notes?: string;
  imageUrl?: string;
  source: FoodSource;
  createdAt: string;
}

// Global Food (Admin controlled)
export interface GlobalFoodRequest {
  name: string;
  category: FoodCategory;
  calories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface GlobalFoodResponse {
  id: string;
  name: string;
  category: FoodCategory;
  calories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  imageUrl: string; // Always present (default image if not provided)
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Food Log (Daily tracking)
export interface FoodLogRequest {
  date: string; // ISO date string (YYYY-MM-DD)
  globalFoodId?: string;
  scannedFoodId?: string;
  quantity?: number; // servings, default 1
}

export interface FoodLogResponse {
  id: string;
  userId: string;
  date: string;
  globalFoodId?: string;
  scannedFoodId?: string;
  quantity: number;
  globalFood?: GlobalFoodResponse;
  scannedFood?: ScannedFoodResponse;
  createdAt: string;
}

// Daily totals response
export interface DailyFoodTotals {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  foodLogs: FoodLogResponse[];
}


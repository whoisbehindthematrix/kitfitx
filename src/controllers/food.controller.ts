import { Request, Response } from "express";
   import ErrorHandler from "@/utils/errorHandler.js";
   import { GoogleGenerativeAI } from "@google/generative-ai";
   import { TryCatch } from "@/middlewares/error.js";

   const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
   const modelId = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

   export const scanFood = TryCatch(async (req: Request, res: Response) => {
     const file = req.file;
     const { prompt } = req.body;

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

    // Gemini sometimes wraps JSON in code fences or adds extra text.
    // 1) Strip fences
    // 2) Extract the first JSON object
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

     return res.status(200).json({
       success: true,
       data: parsed,
     });
   });
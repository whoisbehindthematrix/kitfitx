import { GoogleGenerativeAI } from "@google/generative-ai";
import ErrorHandler from "@/utils/errorHandler";

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const modelId = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 2;

interface LLMConfig {
  timeout?: number;
  maxRetries?: number;
}

/**
 * Reusable LLM client wrapper around Gemini API
 * Handles timeouts, retries, and error fallbacks
 */
export class LLMClient {
  private gemini: GoogleGenerativeAI;
  private modelId: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config?: LLMConfig) {
    this.gemini = gemini;
    this.modelId = modelId;
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config?.maxRetries ?? MAX_RETRIES;
  }

  /**
   * Check if LLM is available (API key configured)
   */
  isAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "";
  }

  /**
   * Generate JSON response from LLM
   * @param prompt - The prompt to send
   * @param schemaHint - Optional JSON schema hint for structured output
   */
  async generateJson<T = unknown>(prompt: string, schemaHint?: string): Promise<T> {
    if (!this.isAvailable()) {
      throw new ErrorHandler("LLM API not configured", 500);
    }

    const fullPrompt = schemaHint
      ? `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON matching this structure:\n${schemaHint}\n\nDo not include any text before or after the JSON.`
      : `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after the JSON.`;

    return this.executeWithRetry(async () => {
      const model = this.gemini.getGenerativeModel({ model: this.modelId });
      const result = await Promise.race([
        model.generateContent(fullPrompt),
        this.createTimeoutPromise(),
      ]);

      const output = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!output) {
        throw new ErrorHandler("LLM response empty", 502);
      }

      return this.parseJsonResponse<T>(output);
    });
  }

  /**
   * Generate plain text response from LLM
   * @param prompt - The prompt to send
   */
  async generateText(prompt: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new ErrorHandler("LLM API not configured", 500);
    }

    return this.executeWithRetry(async () => {
      const model = this.gemini.getGenerativeModel({ model: this.modelId });
      const result = await Promise.race([
        model.generateContent(prompt),
        this.createTimeoutPromise(),
      ]);

      const output = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!output) {
        throw new ErrorHandler("LLM response empty", 502);
      }

      return output.trim();
    });
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s...
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
        break;
      }
    }

    throw new ErrorHandler(
      `LLM request failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`,
      502
    );
  }

  /**
   * Create a timeout promise that rejects after timeout duration
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ErrorHandler(`LLM request timed out after ${this.timeout}ms`, 504));
      }, this.timeout);
    });
  }

  /**
   * Parse JSON response with multiple fallback strategies
   */
  private parseJsonResponse<T>(output: string): T {
    try {
      // Strategy 1: Direct JSON parse
      return JSON.parse(output.trim());
    } catch {
      try {
        // Strategy 2: Remove markdown code blocks
        const cleaned = output.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        return JSON.parse(cleaned);
      } catch {
        try {
          // Strategy 3: Extract JSON object using regex
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Strategy 4: Try array or nested structures
          const anyJsonMatch = output.match(/(\{|\[)[\s\S]*(\}|\])/);
          if (anyJsonMatch) {
            return JSON.parse(anyJsonMatch[0]);
          }
        }
      }
    }

    throw new ErrorHandler(
      `Failed to parse LLM JSON response. Raw output: ${output.substring(0, 200)}...`,
      502
    );
  }
}

// Export singleton instance
export const llmClient = new LLMClient();

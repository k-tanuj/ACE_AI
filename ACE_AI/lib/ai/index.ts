// lib/ai/index.ts — Provider-isolated AI wrapper
// Falls back to deterministic mock when GOOGLE_GENERATIVE_AI_API_KEY is not set

import { google } from "@ai-sdk/google";
import { generateText, generateObject, streamText } from "ai";
import { z } from "zod";

export const AI_AVAILABLE = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const MODEL_NAME = process.env.AI_MODEL || "gemini-1.5-flash";

/** Generate structured JSON output with type safety */
export async function aiGenerateObject<T>(opts: {
  schema: z.ZodSchema<T>;
  prompt: string;
  mockFn: () => T;
}): Promise<T> {
  if (!AI_AVAILABLE) {
    console.log("[AI] Mock mode — returning deterministic mock");
    return opts.mockFn();
  }
  try {
    const result = await generateObject({
      model: google(MODEL_NAME),
      schema: opts.schema,
      prompt: opts.prompt,
    });
    return result.object;
  } catch (err) {
    console.error("[AI] Generation failed, using mock:", err);
    return opts.mockFn();
  }
}

/** Generate plain text */
export async function aiGenerateText(opts: {
  prompt: string;
  system?: string;
  mockFn: () => string;
}): Promise<string> {
  if (!AI_AVAILABLE) return opts.mockFn();
  try {
    const result = await generateText({
      model: google(MODEL_NAME),
      system: opts.system,
      prompt: opts.prompt,
    });
    return result.text;
  } catch {
    return opts.mockFn();
  }
}

export { google, streamText, generateText, generateObject };

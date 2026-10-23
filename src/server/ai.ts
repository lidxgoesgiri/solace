/**
 * Switch for the AI features (PRD 8.11, 20; Safety Contract A1–A2). AI is
 * on only when the OpenRouter key is configured on the server AND the
 * risk-phrase list is ready. The key never leaves the server.
 */

import { riskListReady } from "@/lib/ai/risk-check";

/**
 * The model when OPENROUTER_MODEL is not set: chosen by the project owner,
 * and one of the free models with a zero-data-retention endpoint on
 * OpenRouter (checked 2026-10-19), which the requests insist on.
 */
export const DEFAULT_AI_MODEL = "xingchen-agi/xing4.0-29b-a4b:free";

export interface AiConfig {
  apiKey: string;
  /** OpenRouter model id, shown to the user on the consent screen. */
  model: string;
}

export function aiConfig(env: NodeJS.ProcessEnv = process.env, listReady = riskListReady()): AiConfig | null {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  const model = env.OPENROUTER_MODEL?.trim() || DEFAULT_AI_MODEL;
  if (!apiKey || !model || !listReady) return null;
  return { apiKey, model };
}

/** What the page may know: whether AI is on and which model, never the key. */
export function aiClientInfo(env: NodeJS.ProcessEnv = process.env): { available: boolean; model: string | null } {
  const config = aiConfig(env);
  return { available: config !== null, model: config?.model ?? null };
}

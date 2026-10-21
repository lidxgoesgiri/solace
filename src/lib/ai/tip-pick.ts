/**
 * The AI pick for a tip that did not help (PRD 20.1–20.2, AI-05): the AI
 * chooses one tip from the library's own candidates and adapts its steps to
 * one optional sentence of context. It never writes a new tip and never
 * names a source; sources always come from the library data.
 */

import { isLocale, type Locale } from "@/lib/content";
import type { Tip } from "@/lib/tips";

export const TIP_CONTEXT_MAX_CHARS = 200;
export const TIP_PICK_MAX_CANDIDATES = 8;
export const TIP_PICK_MAX_STEPS = 4;
export const TIP_STEP_MAX_CHARS = 240;
export const TIP_REASON_MAX_CHARS = 280;

export interface TipPickRequest {
  /** The tip the user marked as not helpful. */
  replacedId: string;
  /** Library tips that may take its place, as worked out by `alternativesFor`. */
  candidates: string[];
  /** One optional sentence about the user's situation, in their words. */
  context: string;
  locale: Locale;
}

export interface TipPick {
  tipId: string;
  /** Why this tip may suit the user, in one plain sentence. */
  reason: string;
  /** The chosen tip's own steps, reworded for the user's situation. */
  steps: string[];
}

const byId = (library: readonly Tip[]) => new Map(library.map((tip) => [tip.id, tip]));

/** The request body, or null when it is not one Solace would send. */
export function parseTipPickRequest(input: unknown, library: readonly Tip[]): TipPickRequest | null {
  if (typeof input !== "object" || input === null) return null;
  const { replacedId, candidates, context, locale } = input as Record<string, unknown>;
  const tips = byId(library);
  if (typeof replacedId !== "string" || !tips.has(replacedId)) return null;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  if (candidates.length > TIP_PICK_MAX_CANDIDATES) return null;
  if (!candidates.every((id) => typeof id === "string" && tips.has(id) && id !== replacedId)) {
    return null;
  }
  if (new Set(candidates).size !== candidates.length) return null;
  if (typeof context !== "string" || context.length > TIP_CONTEXT_MAX_CHARS) return null;
  if (typeof locale !== "string" || !isLocale(locale)) return null;
  return { replacedId, candidates: candidates as string[], context: context.trim(), locale };
}

const cleanLine = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const line = value.replace(/\s+/g, " ").trim();
  return line.length > 0 && line.length <= max ? line : null;
};

/** The model's answer, accepted only when it picks one of the candidates. */
export function parseTipPick(value: unknown, candidates: readonly string[]): TipPick | null {
  if (typeof value !== "object" || value === null) return null;
  const { tipId, reason, steps } = value as Record<string, unknown>;
  if (typeof tipId !== "string" || !candidates.includes(tipId)) return null;
  const cleanReason = cleanLine(reason, TIP_REASON_MAX_CHARS);
  if (!cleanReason || !Array.isArray(steps)) return null;
  if (steps.length === 0 || steps.length > TIP_PICK_MAX_STEPS) return null;
  const cleanSteps = steps.map((step) => cleanLine(step, TIP_STEP_MAX_CHARS));
  if (cleanSteps.some((step) => step === null)) return null;
  return { tipId, reason: cleanReason, steps: cleanSteps as string[] };
}

/** What the model sees: the library's own text, nothing about the user but the context. */
export function tipPickPrompt(request: TipPickRequest, library: readonly Tip[]) {
  const tips = byId(library);
  const describe = (tip: Tip) => ({
    id: tip.id,
    title: tip.title[request.locale],
    about: tip.body[request.locale],
    steps: tip.howTo[request.locale],
  });
  return {
    language: request.locale === "id" ? "Indonesian" : "English",
    notHelpful: describe(tips.get(request.replacedId)!),
    candidates: request.candidates.map((id) => describe(tips.get(id)!)),
    context: request.context,
  };
}

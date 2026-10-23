/**
 * The AI pick for a tip that did not help (PRD 20.1–20.2, AI-05): the AI
 * chooses only an ID from the library's own candidates. All displayed
 * content, including steps and sources, comes unchanged from the library.
 */

import { isLocale, type Locale } from "@/lib/content";
import type { Tip } from "@/lib/tips";

export const TIP_CONTEXT_MAX_CHARS = 200;
export const TIP_PICK_MAX_CANDIDATES = 8;

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

/** ID only: refuse free text, extra fields, arrays, and out-of-library IDs. */
export function parseTipPick(value: unknown, candidates: readonly string[]): TipPick | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  if (Object.keys(value).length !== 1 || !Object.hasOwn(value, "tipId")) return null;
  const { tipId } = value as Record<string, unknown>;
  if (typeof tipId !== "string" || !candidates.includes(tipId)) return null;
  return { tipId };
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

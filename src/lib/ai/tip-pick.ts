/**
 * The AI pick for a tip that did not help (PRD 20.1–20.2, AI-05): the AI
 * chooses only an ID from the library's own candidates. All displayed
 * content, including steps and sources, comes unchanged from the library.
 *
 * When the user wrote about their situation, the AI also puts what they
 * seem to feel into one or two sentences: a single reflection, not a
 * conversation. Naming a feeling can ease it (affect labeling; Torre &
 * Lieberman, 2018, doi:10.1177/1754073917742706), and users of mental
 * health chatbots judge them largely by the relationship and how well they
 * communicate (Li et al., 2023, doi:10.1038/s41746-023-00979-5). A user who
 * only wants to be heard gets the reflection and no tip.
 */

import { isLocale, type Locale } from "@/lib/content";
import type { Tip } from "@/lib/tips";

export const TIP_CONTEXT_MAX_CHARS = 200;
export const TIP_PICK_MAX_CANDIDATES = 8;
export const REFLECTION_MAX_CHARS = 280;

/** "tip": choose another tip; "listen": the user only wants to be heard. */
export const TIP_PICK_MODES = ["tip", "listen"] as const;
export type TipPickMode = (typeof TIP_PICK_MODES)[number];

export interface TipPickRequest {
  /** The tip the user marked as not helpful. */
  replacedId: string;
  /** Library tips that may take its place, as worked out by `alternativesFor`. */
  candidates: string[];
  /** One optional sentence about the user's situation, in their words. */
  context: string;
  locale: Locale;
  mode: TipPickMode;
}

/** A library ID, a reflection on the user's sentence, or both. */
export interface TipPick {
  tipId?: string;
  reflection?: string;
}

/** What a reply to this request must contain, no more and no less. */
export function expectedReply(request: Pick<TipPickRequest, "context" | "mode">): { tip: boolean; reflection: boolean } {
  return { tip: request.mode === "tip", reflection: request.context.length > 0 };
}

const byId = (library: readonly Tip[]) => new Map(library.map((tip) => [tip.id, tip]));

/** The request body, or null when it is not one Solace would send. */
export function parseTipPickRequest(input: unknown, library: readonly Tip[]): TipPickRequest | null {
  if (typeof input !== "object" || input === null) return null;
  const { replacedId, candidates, context, locale, mode = "tip" } = input as Record<string, unknown>;
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
  if (!TIP_PICK_MODES.includes(mode as TipPickMode)) return null;
  // Listening needs something to listen to.
  if (mode === "listen" && !context.trim()) return null;
  return { replacedId, candidates: candidates as string[], context: context.trim(), locale, mode: mode as TipPickMode };
}

/**
 * What a reflection may not contain, whatever the model wrote:
 * - links, e-mail addresses and long numbers: help comes only from the
 *   verified directory, never from a model (smartphone agents answered
 *   crises inconsistently; Miner et al., 2016, doi:10.1001/jamainternmed.2016.0400);
 * - questions: it is one reply, not a conversation (PRD 20.1);
 * - diagnoses, disorder names and medicine (PRD 17, 20.1);
 * - emoji and repeated exclamation marks (PRD 17).
 */
const NOT_IN_REFLECTION: readonly RegExp[] = [
  /https?:|www\.|@|\.(com|id|org|net|io)\b/i,
  /\d{3,}/,
  /[?？]/,
  /[\r\n]/,
  /!{2,}/,
  /\p{Extended_Pictographic}/u,
  /\b(diagnos\w*|didiagnosis|mengidap|gangguan|disorders?|bipolar|ptsd|ocd|adhd|skizofren\w*|schizophren\w*|psikosis|psychosis|obat\w*|medication|medicines?|antidepress\w*|antidepresan)\b/i,
];

/** A short, single-paragraph reflection, or null when it breaks any rule. */
export function parseReflection(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/[ \t]+/g, " ").trim();
  if (!text || Array.from(text).length > REFLECTION_MAX_CHARS) return null;
  return NOT_IN_REFLECTION.some((rule) => rule.test(text)) ? null : text;
}

/**
 * Exactly the expected fields: a candidate ID, a valid reflection, or
 * both. Free text, extra fields, arrays, and out-of-library IDs are refused.
 */
export function parseTipPick(
  value: unknown,
  candidates: readonly string[],
  expected: { tip: boolean; reflection: boolean } = { tip: true, reflection: false },
): TipPick | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const keys = [...(expected.tip ? ["tipId"] : []), ...(expected.reflection ? ["reflection"] : [])];
  if (keys.length === 0 || Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const pick: TipPick = {};
  if (expected.tip) {
    if (typeof record.tipId !== "string" || !candidates.includes(record.tipId)) return null;
    pick.tipId = record.tipId;
  }
  if (expected.reflection) {
    const reflection = parseReflection(record.reflection);
    if (!reflection) return null;
    pick.reflection = reflection;
  }
  return pick;
}

/** What the model sees: the library's own text, nothing about the user but the context. */
export function tipPickPrompt(request: TipPickRequest, library: readonly Tip[]) {
  const language = request.locale === "id" ? "Indonesian" : "English";
  // Listening needs no tips: fewer tokens, and nothing to steer towards advice.
  if (request.mode === "listen") return { language, context: request.context };
  const tips = byId(library);
  const describe = (tip: Tip) => ({
    id: tip.id,
    title: tip.title[request.locale],
    about: tip.body[request.locale],
    steps: tip.howTo[request.locale],
  });
  return {
    language,
    notHelpful: describe(tips.get(request.replacedId)!),
    candidates: request.candidates.map((id) => describe(tips.get(id)!)),
    context: request.context,
  };
}

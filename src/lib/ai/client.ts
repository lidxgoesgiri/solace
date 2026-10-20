/**
 * Browser side of the AI features. Consent (A1) lasts for this tab
 * only and belongs to the signed-in username, so another account on the
 * same device is asked again.
 */

import { aiConsent, validAiConsent, type AiFeature } from "./consent";
import { NOTE_OUTPUT_MAX_CHARS, parseNoteAnswers, type NoteAnswers } from "./notes";
import { parseTipPick, type TipPick, type TipPickRequest } from "./tip-pick";

const CONSENT_KEY = "solace-ai-consent-v2";
// Private mode may refuse storage. This contains consent metadata only.
const tabConsent = new Map<AiFeature, { username: string; model: string }>();

export function hasAiConsent(username: string | null, feature: AiFeature, model: string | null): boolean {
  if (!username || !model || typeof window === "undefined") return false;
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(`${CONSENT_KEY}-${feature}`) ?? "null");
    if (stored === null) {
      const consent = tabConsent.get(feature);
      return consent?.username === username && consent.model === model;
    }
    if (typeof stored !== "object") return false;
    const record = stored as Record<string, unknown>;
    return record.username === username && validAiConsent(record, feature, model);
  } catch {
    const consent = tabConsent.get(feature);
    return consent?.username === username && consent.model === model;
  }
}

export function saveAiConsent(username: string, feature: AiFeature, model: string): void {
  try {
    window.sessionStorage.setItem(`${CONSENT_KEY}-${feature}`, JSON.stringify({ username, ...aiConsent(feature, model) }));
    tabConsent.delete(feature);
  } catch {
    tabConsent.set(feature, { username, model });
  }
}

export interface AiRequestContext {
  username: string | null;
  model: string | null;
  signal?: AbortSignal;
}

type Failure = { kind: "risk" | "limited" | "busy" | "signed_out" | "consent" | "cancelled" | "error" };
export type TidyResult =
  | { kind: "ok"; answers: string[] }
  | Failure;

async function send(feature: AiFeature, input: object, context: AiRequestContext): Promise<{ kind: "ok"; body: unknown } | Failure> {
  if (!context.username) return { kind: "signed_out" };
  if (!hasAiConsent(context.username, feature, context.model)) return { kind: "consent" };
  if (context.signal?.aborted) return { kind: "cancelled" };
  try {
    const response = await fetch(`/api/ai/${feature}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ ...input, consent: aiConsent(feature, context.model!) }),
      signal: AbortSignal.any([AbortSignal.timeout(35_000), ...(context.signal ? [context.signal] : [])]),
    });
    if (response.status === 422) return { kind: "risk" };
    if (response.status === 429) return { kind: "limited" };
    if (response.status === 401) return { kind: "signed_out" };
    if (response.status === 403) return { kind: "consent" };
    const body: unknown = await response.json().catch(() => null);
    if (response.status === 503 && typeof body === "object" && body !== null && "error" in body && body.error === "ai_busy") return { kind: "busy" };
    return response.ok ? { kind: "ok", body } : { kind: "error" };
  } catch {
    return { kind: context.signal?.aborted ? "cancelled" : "error" };
  }
}

export async function requestTidyNotes(answers: NoteAnswers, context: AiRequestContext): Promise<TidyResult> {
  const result = await send("notes", { answers }, context);
  if (result.kind !== "ok") return result;
  const body = result.body;
  const answersOut = typeof body === "object" && body !== null && "answers" in body
    ? parseNoteAnswers(body.answers, NOTE_OUTPUT_MAX_CHARS) : null;
  return answersOut ? { kind: "ok", answers: answersOut } : { kind: "error" };
}

export type TipPickResult = { kind: "ok"; pick: TipPick } | Failure;

/** No model text survives the client boundary either. */
export async function requestTipPick(request: TipPickRequest, context: AiRequestContext): Promise<TipPickResult> {
  const result = await send("tips", request, context);
  if (result.kind !== "ok") return result;
  const pick = parseTipPick(result.body, request.candidates);
  return pick ? { kind: "ok", pick } : { kind: "error" };
}

/** Provider failure is not AI success. Never fall back over consent/auth/risk. */
export function tipRecommendation(result: TipPickResult, candidates: readonly string[]): { pick: TipPick; source: "ai" | "deterministic" } | null {
  if (result.kind === "ok") {
    const pick = parseTipPick(result.pick, candidates);
    return pick ? { pick, source: "ai" } : null;
  }
  if ((result.kind === "error" || result.kind === "busy" || result.kind === "limited") && candidates[0]) {
    return { pick: { tipId: candidates[0] }, source: "deterministic" };
  }
  return null;
}

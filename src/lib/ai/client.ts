/**
 * Browser side of the AI features. Consent (A1) lasts for this tab
 * only and belongs to the signed-in username, so another account on the
 * same device is asked again.
 */

import type { NoteAnswers } from "./notes";
import { parseTipPick, type TipPick, type TipPickRequest } from "./tip-pick";

const CONSENT_KEY = "solace-ai-consent";

export function hasAiConsent(username: string | null): boolean {
  if (!username || typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(CONSENT_KEY) === username;
  } catch {
    return false;
  }
}

export function saveAiConsent(username: string): void {
  try {
    window.sessionStorage.setItem(CONSENT_KEY, username);
  } catch {
    // Private mode: consent then lasts until the page is reloaded.
  }
}

export type TidyResult =
  | { kind: "ok"; answers: string[] }
  | { kind: "risk" }
  | { kind: "limited" }
  | { kind: "busy" }
  | { kind: "signed_out" }
  | { kind: "error" };

export async function requestTidyNotes(answers: NoteAnswers): Promise<TidyResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ answers }),
    });
  } catch {
    return { kind: "error" };
  }
  if (response.status === 422) return { kind: "risk" };
  if (response.status === 429) return { kind: "limited" };
  if (response.status === 401) return { kind: "signed_out" };
  if (response.status === 503 && await isProviderBusy(response)) return { kind: "busy" };
  if (!response.ok) return { kind: "error" };
  const body: unknown = await response.json().catch(() => null);
  const result = body && typeof body === "object" ? (body as { answers?: unknown }).answers : null;
  if (!Array.isArray(result) || !result.every((answer) => typeof answer === "string")) return { kind: "error" };
  return { kind: "ok", answers: result };
}

export type TipPickResult =
  | { kind: "ok"; pick: TipPick }
  | { kind: "risk" }
  | { kind: "limited" }
  | { kind: "busy" }
  | { kind: "signed_out" }
  | { kind: "error" };

/** Asks the AI to choose among `request.candidates`; anything else is an error. */
export async function requestTipPick(request: TipPickRequest): Promise<TipPickResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(request),
    });
  } catch {
    return { kind: "error" };
  }
  if (response.status === 422) return { kind: "risk" };
  if (response.status === 429) return { kind: "limited" };
  if (response.status === 401) return { kind: "signed_out" };
  if (response.status === 503 && await isProviderBusy(response)) return { kind: "busy" };
  if (!response.ok) return { kind: "error" };
  const pick = parseTipPick(await response.json().catch(() => null), request.candidates);
  return pick ? { kind: "ok", pick } : { kind: "error" };
}

/** A provider capacity limit is different from the account's daily limit. */
async function isProviderBusy(response: Response): Promise<boolean> {
  const body: unknown = await response.json().catch(() => null);
  return typeof body === "object" && body !== null && "error" in body && body.error === "ai_busy";
}

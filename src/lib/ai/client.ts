/**
 * Browser side of the AI notes feature. Consent (A1) lasts for this tab
 * only and belongs to the signed-in username, so another account on the
 * same device is asked again.
 */

import type { NoteAnswers } from "./notes";

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
  if (!response.ok) return { kind: "error" };
  const body: unknown = await response.json().catch(() => null);
  const result = body && typeof body === "object" ? (body as { answers?: unknown }).answers : null;
  if (!Array.isArray(result) || !result.every((answer) => typeof answer === "string")) return { kind: "error" };
  return { kind: "ok", answers: result };
}

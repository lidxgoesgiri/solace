/**
 * Notes for the psychologist (PRD 20.2, AI-04): five guided questions the
 * user answers in their own words. The answers stay in the page's memory
 * and become an extra page of the PDF. Tidying them with AI is optional
 * and guarded (A1–A3); without AI the notes work for everyone.
 */

/** Message keys of the five questions, in order (report.notes.questions.*). */
export const NOTE_QUESTIONS = ["since", "hardest", "tried", "ask", "hope"] as const;
export type NoteQuestion = (typeof NOTE_QUESTIONS)[number];

export const NOTE_MAX_CHARS = 600;
/** Room for the AI to rephrase without growing a note much. */
export const NOTE_OUTPUT_MAX_CHARS = 1200;

export type NoteAnswers = readonly string[];

export const EMPTY_NOTES: NoteAnswers = NOTE_QUESTIONS.map(() => "");

/** Control characters out, line breaks kept, spaces tidied, length capped. */
export function cleanNote(text: string, max = NOTE_MAX_CHARS): string {
  return Array.from(
    text
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  )
    .slice(0, max)
    .join("")
    .trim();
}

/** Five strings within the limit, or null for anything else. */
export function parseNoteAnswers(input: unknown, max = NOTE_MAX_CHARS): string[] | null {
  if (!Array.isArray(input) || input.length !== NOTE_QUESTIONS.length) return null;
  if (!input.every((answer) => typeof answer === "string" && answer.length <= max * 2)) return null;
  return input.map((answer: string) => cleanNote(answer, max));
}

export function hasNotes(answers: NoteAnswers): boolean {
  return answers.some((answer) => answer.trim().length > 0);
}

export type AiOffer = "hidden" | "sign_in" | "consent" | "ready";

/**
 * Whether and how the "tidy with AI" step is offered.
 * - A1: off by default; it needs the server switch and the user's consent.
 * - A3: never while a crisis is pending.
 * - The AI step needs an account, so its use can be limited per user.
 */
export function aiOffer({
  available,
  signedIn,
  consented,
  crisisPending,
}: {
  available: boolean;
  signedIn: boolean;
  consented: boolean;
  crisisPending: boolean;
}): AiOffer {
  if (!available || crisisPending) return "hidden";
  if (!signedIn) return "sign_in";
  return consented ? "ready" : "consent";
}

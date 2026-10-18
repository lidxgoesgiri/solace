/**
 * POST /api/ai/notes (PRD 20.2–20.3, AI-02, AI-06, AI-07): tidies the
 * user's own notes for the psychologist with an AI model via OpenRouter.
 *
 * - Signed-in users only, limited per day.
 * - The notes are checked against the reviewed risk phrases before any AI
 *   call; a match answers `risk_detected` and the browser opens the crisis
 *   screen (A2). The output is checked again.
 * - Only the five typed answers are sent: no scores, item answers,
 *   username, or account data (AI-07). OpenRouter is asked to route only
 *   to providers that do not collect data, with zero data retention.
 * - Prompts and outputs are never logged.
 */

import { containsRiskPhrase } from "@/lib/ai/risk-check";
import { NOTE_MAX_CHARS, NOTE_OUTPUT_MAX_CHARS, hasNotes, parseNoteAnswers } from "@/lib/ai/notes";
import type { AiConfig } from "../ai";
import { aiConfig } from "../ai";
import type { ApiContext } from "../context";
import { fail, isRecord, json, readJson } from "../http";
import { LIMITS, hitDbLimit } from "../rate-limit";
import { currentSession } from "../session";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_BODY = 16 * 1024;
const TIMEOUT_MS = 25_000;

/** The limits of the task (PRD 20.1): tidy the user's words, nothing more. */
export const NOTES_SYSTEM_PROMPT = [
  "You help a university student prepare notes for a first appointment with a psychologist.",
  "The user message is a JSON array of the student's own answers to five questions, in this order:",
  "1) since when they have felt this way; 2) what troubles them most in daily life; 3) what they have already tried;",
  "4) what they want to ask the psychologist; 5) what they hope for from the first session.",
  "Tidy each answer: fix spelling and grammar, remove repetition, and write it as clear, short first-person sentences.",
  "Keep the student's own words, meaning, and language: Indonesian stays Indonesian and English stays English.",
  "Keep every fact the student gave and add none.",
  "Do not diagnose, do not name disorders, do not interpret, do not judge, and do not give advice, tips, or questions.",
  "If an answer is an empty string, return an empty string for it.",
  'Reply with JSON only, exactly in this shape: {"answers": ["", "", "", "", ""]}',
].join("\n");

export interface AiDeps {
  fetch: typeof fetch;
  config: () => AiConfig | null;
  /** The reviewed risk check; injectable so tests need no clinical list. */
  isRisky?: (text: string) => boolean;
}

/** The first JSON object in the model's reply, as five tidied answers. */
export function parseModelReply(content: unknown, inputs: readonly string[]): string[] | null {
  if (typeof content !== "string") return null;
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const answers = parseNoteAnswers(parsed.answers, NOTE_OUTPUT_MAX_CHARS);
  if (!answers) return null;
  // An unanswered question stays unanswered, whatever the model wrote.
  return answers.map((answer, index) => (inputs[index] ? answer : ""));
}

export function makeTidyNotes(deps: AiDeps) {
  const isRisky = deps.isRisky ?? ((text: string) => containsRiskPhrase(text));
  return async function tidyNotes(request: Request, ctx: ApiContext): Promise<Response> {
    const session = await currentSession(ctx.db, request, ctx.now());
    if (!session) return fail(401, "unauthorized");
    const config = deps.config();
    if (!config) return fail(503, "ai_disabled");

    const input = await readJson(request, MAX_BODY);
    if (input === undefined) return fail(413, "too_large");
    const answers = isRecord(input) ? parseNoteAnswers(input.answers, NOTE_MAX_CHARS) : null;
    if (!answers || !hasNotes(answers)) return fail(400, "invalid_request");

    // A2: risky words go to the crisis screen, never to the AI.
    if (answers.some(isRisky)) return fail(422, "risk_detected");

    const limit = await hitDbLimit(ctx.db, `ai-notes:${session.userId}`, LIMITS.aiNotesPerUser, ctx.now());
    if (!limit.ok) return fail(429, "rate_limited", { "Retry-After": String(limit.retryAfter) });

    let tidied: string[] | null = null;
    try {
      const response = await deps.fetch(OPENROUTER_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: NOTES_SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(answers) },
          ],
          temperature: 0.2,
          max_tokens: 1500,
          // Only providers that do not collect data, with zero data retention.
          provider: { data_collection: "deny", zdr: true },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) {
        const data: unknown = await response.json();
        const choices = isRecord(data) && Array.isArray(data.choices) ? data.choices : [];
        const message = isRecord(choices[0]) && isRecord(choices[0].message) ? choices[0].message : null;
        tidied = parseModelReply(message?.content, answers);
      }
    } catch {
      tidied = null;
    }
    // The output is checked like the input; anything unusable keeps the user's own text.
    if (!tidied || tidied.some(isRisky)) {
      return fail(502, "ai_unavailable", { "Set-Cookie": session.cookie });
    }
    return json({ answers: tidied }, { headers: { "Set-Cookie": session.cookie } });
  };
}

export const tidyNotes = makeTidyNotes({ fetch: (...args) => fetch(...args), config: () => aiConfig() });

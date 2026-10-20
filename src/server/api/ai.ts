/**
 * The AI features (PRD 20.2–20.3, AI-02, AI-05, AI-06, AI-07), via OpenRouter.
 *
 * POST /api/ai/notes tidies the user's own notes for the psychologist.
 * POST /api/ai/tips picks another library tip when one did not help.
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
import { parseTipPick, parseTipPickRequest, tipPickPrompt } from "@/lib/ai/tip-pick";
import { TIPS } from "@/lib/tips";
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

/**
 * The limits of the tip pick (PRD 20.1): choose from the library and reword
 * its steps; no new tips, techniques, or sources.
 */
export const TIPS_SYSTEM_PROMPT = [
  "You help a university student who tried a self-help tip that did not help them.",
  "The user message is JSON with: language, notHelpful (the tip that did not help), candidates (tips from an evidence-based library), and context (one optional sentence the student wrote; it may be empty).",
  "Choose exactly one candidate that is most likely to suit the student, preferably one that works in a different way from the tip that did not help.",
  "Then rewrite the chosen candidate's steps so they fit the student's situation: keep the same technique and the same actions, and change only the examples and the wording.",
  "Do not add techniques, exercises, apps, medication, supplements, or sources that are not in the chosen candidate.",
  "Do not diagnose, do not name disorders, do not promise results, and do not judge.",
  "Write in the given language and address the student directly and warmly.",
  "steps: 2 to 4 short sentences. reason: one short sentence on why this tip may suit them, without clinical claims.",
  'Reply with JSON only, exactly in this shape: {"tipId": "", "reason": "", "steps": [""]}',
].join("\n");

export interface AiDeps {
  fetch: typeof fetch;
  config: () => AiConfig | null;
  /** The reviewed risk check; injectable so tests need no clinical list. */
  isRisky?: (text: string) => boolean;
}

/** The first JSON object in a model reply. */
function replyObject(content: unknown): Record<string, unknown> | null {
  if (typeof content !== "string") return null;
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(content.slice(start, end + 1));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** The first JSON object in the model's reply, as five tidied answers. */
export function parseModelReply(content: unknown, inputs: readonly string[]): string[] | null {
  const parsed = replyObject(content);
  if (!parsed) return null;
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

    const content = await callModel(deps, config, NOTES_SYSTEM_PROMPT, JSON.stringify(answers), 1500);
    const tidied = parseModelReply(content, answers);
    // The output is checked like the input; anything unusable keeps the user's own text.
    if (!tidied || tidied.some(isRisky)) {
      return fail(502, "ai_unavailable", { "Set-Cookie": session.cookie });
    }
    return json({ answers: tidied }, { headers: { "Set-Cookie": session.cookie } });
  };
}

/** One chat completion; null when the call fails. Prompts and replies are never logged. */
async function callModel(
  deps: AiDeps,
  config: AiConfig,
  system: string,
  user: string,
  maxTokens: number,
): Promise<unknown> {
  try {
    const response = await deps.fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        // These are short rewriting tasks. Reasoning models can otherwise
        // spend the completion budget on reasoning and return no JSON.
        reasoning: { enabled: false },
        response_format: { type: "json_object" },
        // Only providers that do not collect data, with zero data retention.
        provider: { data_collection: "deny", zdr: true },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      // Fixed metadata only: never the provider's error body, prompts, key,
      // or generated text (PRD 13.5, AI-07).
      console.warn("AI provider unavailable", { reason: "http", status: response.status });
      return null;
    }
    const data: unknown = await response.json();
    const choices = isRecord(data) && Array.isArray(data.choices) ? data.choices : [];
    const choice = isRecord(choices[0]) ? choices[0] : null;
    const message = choice && isRecord(choice.message) ? choice.message : null;
    if (choice?.finish_reason === "length") {
      console.warn("AI provider unavailable", { reason: "truncated" });
      return null;
    }
    if (typeof message?.content !== "string" || !message.content.trim()) {
      console.warn("AI provider unavailable", { reason: "empty_reply" });
      return null;
    }
    return message.content;
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.warn("AI provider unavailable", { reason: timedOut ? "timeout" : "request_failed" });
    return null;
  }
}

/**
 * POST /api/ai/tips: the user marked a tip as not helpful; the AI picks one
 * of the library candidates and rewords its steps for their context.
 *
 * - Signed-in users only, limited per day.
 * - Only the candidate tips' library text and the optional context sentence
 *   are sent: no scores, categories, answers, username, or account data.
 * - The context is checked against the risk phrases first (A2), and the
 *   reply again. A reply that names a tip outside the candidates is refused,
 *   so the AI cannot invent a tip; sources are shown from the library data.
 */
export function makePickTip(deps: AiDeps) {
  const isRisky = deps.isRisky ?? ((text: string) => containsRiskPhrase(text));
  return async function pickTip(request: Request, ctx: ApiContext): Promise<Response> {
    const session = await currentSession(ctx.db, request, ctx.now());
    if (!session) return fail(401, "unauthorized");
    const config = deps.config();
    if (!config) return fail(503, "ai_disabled");

    const input = await readJson(request, MAX_BODY);
    if (input === undefined) return fail(413, "too_large");
    const pick = parseTipPickRequest(input, TIPS);
    if (!pick) return fail(400, "invalid_request");

    // A2: risky words go to the crisis screen, never to the AI.
    if (pick.context && isRisky(pick.context)) return fail(422, "risk_detected");

    const limit = await hitDbLimit(ctx.db, `ai-tips:${session.userId}`, LIMITS.aiTipsPerUser, ctx.now());
    if (!limit.ok) return fail(429, "rate_limited", { "Retry-After": String(limit.retryAfter) });

    const prompt = JSON.stringify(tipPickPrompt(pick, TIPS));
    const result = parseTipPick(replyObject(await callModel(deps, config, TIPS_SYSTEM_PROMPT, prompt, 800)), pick.candidates);
    // The reply is checked like the input; a refused reply leaves the library swap.
    if (!result || isRisky(result.reason) || result.steps.some(isRisky)) {
      return fail(502, "ai_unavailable", { "Set-Cookie": session.cookie });
    }
    return json(result, { headers: { "Set-Cookie": session.cookie } });
  };
}

const liveDeps: AiDeps = { fetch: (...args) => fetch(...args), config: () => aiConfig() };

export const tidyNotes = makeTidyNotes(liveDeps);
export const pickTip = makePickTip(liveDeps);

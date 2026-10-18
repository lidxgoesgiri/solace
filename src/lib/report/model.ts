/**
 * Content of the PDF report for a psychologist (PRD 12). Pure functions only.
 *
 * Scores come from the same `Dass21Result` object the results page renders
 * (HS-01, PDF-02), never from a separate calculation.
 */

import {
  NOTE_OUTPUT_MAX_CHARS,
  NOTE_QUESTIONS,
  cleanNote,
  type NoteAnswers,
  type NoteQuestion,
} from "@/lib/ai/notes";
import {
  getDass21,
  getSafetyQuestion,
  isTodoPlaceholder,
  servicesFor,
  type Country,
  type HelpService,
  type Locale,
} from "@/lib/content";
import type { FlowState } from "@/lib/flow";
import {
  CUTOFFS,
  SEVERITIES,
  SUBSCALES,
  SUBSCALE_ITEMS,
  isAnswerValue,
  type AnswerValue,
  type Dass21Result,
  type Severity,
  type Subscale,
} from "@/lib/scoring";

export const NICKNAME_MAX_LENGTH = 40;

export interface ReportOptions {
  /** Language of the report text. */
  locale: Locale;
  /** Country for the help directory (DL-01). */
  country: Country;
  /** Optional nickname typed by the user; empty by default (PRD 12). */
  nickname: string;
  /** Whether the safety note is included; the user decides, default true. */
  includeSafety: boolean;
  /** Random report code, not an identity. */
  code: string;
  /** Optional notes for the psychologist, one per guided question (AI-04). */
  notes?: { answers: NoteAnswers; aiAssisted: boolean } | null;
}

export interface ReportNotes {
  /** Answered questions only, in order. */
  entries: { question: NoteQuestion; answer: string }[];
  /** The text was tidied with AI and checked by the user (AI-06). */
  aiAssisted: boolean;
}

export interface ReportScore {
  subscale: Subscale;
  raw: number;
  score: number;
  severity: Severity;
}

export interface ReportItem {
  number: number;
  text: string;
  subscale: Subscale;
  answer: AnswerValue;
}

export interface ReportSafety {
  answer: AnswerValue;
  optionLabel: string;
  crisisShown: boolean;
}

export interface ReportSource {
  text: string;
  url: string | null;
}

/** Where the instrument wording comes from: the official form or a translation. */
export type LanguageSource =
  | { kind: "official"; url: string | null }
  | { kind: "translation"; text: string; url: string | null };

export interface ReportModel {
  locale: Locale;
  code: string;
  nickname: string | null;
  completedAt: string | null;
  instrumentLocale: Locale | null;
  scores: ReportScore[];
  safety: ReportSafety | null;
  items: ReportItem[];
  /** Item text fell back to the official English wording (placeholder ID text). */
  usesEnglishItemText: boolean;
  answerScale: { value: AnswerValue; label: string }[];
  instrument: ReportSource;
  /** Where the instrument wording in `instrumentLocale` comes from. */
  languageSource: LanguageSource | null;
  cutoffs: { severity: Severity; ranges: Record<Subscale, string> }[];
  country: Country;
  services: HelpService[];
  /** Page 3, only when the user wrote notes and chose to include them. */
  notes: ReportNotes | null;
  fileName: string;
}

const SUBSCALE_OF_ITEM: ReadonlyMap<number, Subscale> = new Map(
  SUBSCALES.flatMap((subscale) =>
    SUBSCALE_ITEMS[subscale].map((item) => [item, subscale] as const),
  ),
);

/** Trimmed nickname without control characters, or null when empty. */
export function cleanNickname(input: string): string | null {
  const cleaned = Array.from(input.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
    .slice(0, NICKNAME_MAX_LENGTH)
    .join("")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Score ranges per category, derived from the single CUTOFFS constant. */
export function cutoffRanges(): ReportModel["cutoffs"] {
  return SEVERITIES.map((severity, index) => {
    const ranges = {} as Record<Subscale, string>;
    for (const subscale of SUBSCALES) {
      const c = CUTOFFS[subscale];
      const lower = [0, c.mild, c.moderate, c.severe, c.extremely_severe];
      const start = lower[index] ?? 0;
      const next = lower[index + 1];
      ranges[subscale] = next === undefined ? `${start}+` : `${start}–${next - 1}`;
    }
    return { severity, ranges };
  });
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `solace-dass21-YYYY-MM-DD.pdf` in local time, with no user name (PRD 12). */
export function reportFileName(completedAt: string | null, now: Date): string {
  const date = completedAt ? new Date(completedAt) : now;
  const day = Number.isNaN(date.getTime()) ? now : date;
  return `solace-dass21-${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}.pdf`;
}

// Crockford base32 without I, L, O, U: easy to read aloud and copy.
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** A random report code such as `SOL-7K2Q-9MXD`. It is not linked to anyone. */
export function generateReportCode(
  random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes),
): string {
  const bytes = random(new Uint8Array(8));
  const chars = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]);
  return `SOL-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

function reportNotes(notes: ReportOptions["notes"]): ReportNotes | null {
  if (!notes) return null;
  const entries = NOTE_QUESTIONS.flatMap((question, index) => {
    const answer = cleanNote(notes.answers[index] ?? "", NOTE_OUTPUT_MAX_CHARS);
    return answer ? [{ question, answer }] : [];
  });
  return entries.length > 0 ? { entries, aiAssisted: notes.aiAssisted } : null;
}

/** Text in the report language, or the official English text for placeholders. */
function textOrEnglish(text: string, english: string): { text: string; fallback: boolean } {
  return isTodoPlaceholder(text) ? { text: english, fallback: true } : { text, fallback: false };
}

export function buildReportModel(
  flow: FlowState,
  result: Dass21Result,
  options: ReportOptions,
  now: Date = new Date(),
): ReportModel {
  const dass = getDass21(options.locale);
  const dassEn = getDass21("en");
  const safetyQuestion = getSafetyQuestion(options.locale);
  const safetyQuestionEn = getSafetyQuestion("en");

  let usesEnglishItemText = false;
  const items: ReportItem[] = dass.items.map((item, index) => {
    const answer = flow.answers[index];
    const subscale = SUBSCALE_OF_ITEM.get(item.number);
    if (!isAnswerValue(answer) || !subscale) {
      throw new Error(`Item ${item.number} is not answered; the report needs a finished screening`);
    }
    const { text, fallback } = textOrEnglish(item.text, dassEn.items[index]?.text ?? item.text);
    usesEnglishItemText ||= fallback;
    return { number: item.number, text, subscale, answer };
  });

  const answerScale = dass.options.map((option, index) => ({
    value: option.value,
    label: textOrEnglish(option.label, dassEn.options[index]?.label ?? option.label).text,
  }));

  let safety: ReportSafety | null = null;
  if (options.includeSafety && flow.safetyAnswer !== null) {
    const answer = flow.safetyAnswer;
    safety = {
      answer,
      optionLabel: textOrEnglish(
        safetyQuestion.options[answer]?.label ?? "",
        safetyQuestionEn.options[answer]?.label ?? "",
      ).text,
      crisisShown: flow.crisis === "crisis_acknowledged",
    };
  }

  const instrumentLocale = flow.completedLocale;
  const languageSource: LanguageSource | null =
    instrumentLocale === "id"
      ? { kind: "translation", text: getDass21("id").citation.text, url: getDass21("id").citation.url }
      : instrumentLocale === "en"
        ? { kind: "official", url: dassEn.textSource?.url ?? null }
        : null;

  return {
    locale: options.locale,
    code: options.code,
    nickname: cleanNickname(options.nickname),
    completedAt: flow.completedAt,
    instrumentLocale,
    scores: SUBSCALES.map((subscale) => ({ subscale, ...result[subscale] })),
    safety,
    items,
    usesEnglishItemText,
    answerScale,
    instrument: { text: dassEn.citation.text, url: dassEn.citation.url },
    languageSource,
    cutoffs: cutoffRanges(),
    country: options.country,
    services: [...servicesFor(options.country, "emergency"), ...servicesFor(options.country, "support")],
    notes: reportNotes(options.notes),
    fileName: reportFileName(flow.completedAt, now),
  };
}

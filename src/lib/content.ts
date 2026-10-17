/**
 * Typed access to clinical content and the help directory in `src/data`.
 * Text in these files is never written by hand in components.
 */

import dass21En from "@/data/dass21.en.json";
import dass21Id from "@/data/dass21.id.json";
import safetyEn from "@/data/safety-question.en.json";
import safetyId from "@/data/safety-question.id.json";
import type { AnswerValue } from "./scoring";

// The help directory lives in its own module so that client pages that only
// need hotlines do not also bundle the DASS-21 and PHQ-9 text.
export {
  COUNTRIES,
  SERVICE_TYPES,
  helpDirectory,
  isCountry,
  servicesFor,
  type Country,
  type HelpDirectory,
  type HelpService,
  type ServiceCategory,
  type ServiceChannel,
  type ServiceType,
} from "./hotlines";

export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export interface AnswerOption {
  value: AnswerValue;
  label: string;
}

export interface Dass21Content {
  instrument: string;
  language: Locale;
  status: string;
  citation: { text: string; doi: string; url: string };
  textSource?: { url: string | null; checkedAt: string | null; note: string };
  instructions: string;
  options: AnswerOption[];
  items: { number: number; text: string }[];
}

export interface SafetyQuestionContent {
  instrument: string;
  item: number;
  language: Locale;
  status: string;
  stem: string;
  text: string;
  options: AnswerOption[];
}

const DASS21: Record<Locale, Dass21Content> = {
  en: dass21En as Dass21Content,
  id: dass21Id as Dass21Content,
};

const SAFETY_QUESTION: Record<Locale, SafetyQuestionContent> = {
  en: safetyEn as SafetyQuestionContent,
  id: safetyId as SafetyQuestionContent,
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function getDass21(locale: Locale): Dass21Content {
  return DASS21[locale];
}

export function getSafetyQuestion(locale: Locale): SafetyQuestionContent {
  return SAFETY_QUESTION[locale];
}

/** Placeholder text that is waiting for verified clinical content. */
export function isTodoPlaceholder(text: string): boolean {
  return text.startsWith("TODO(verify)");
}

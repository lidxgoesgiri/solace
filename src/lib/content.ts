/**
 * Typed access to clinical content and the help directory in `src/data`.
 * Text in these files is never written by hand in components.
 */

import dass21En from "@/data/dass21.en.json";
import dass21Id from "@/data/dass21.id.json";
import hotlinesJson from "@/data/hotlines.json";
import safetyEn from "@/data/safety-question.en.json";
import safetyId from "@/data/safety-question.id.json";
import type { AnswerValue } from "./scoring";

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

export const COUNTRIES = ["ID", "US", "GB"] as const;
export type Country = (typeof COUNTRIES)[number];

export const SERVICE_TYPES = ["public", "government", "nonprofit"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export type ServiceCategory = "emergency" | "support";

export type ServiceChannel =
  | { kind: "phone"; number: string; label: string }
  | { kind: "web"; url: string; label: string };

export interface HelpService {
  id: string;
  country: Country;
  category: ServiceCategory;
  name: string;
  type: ServiceType;
  channels: ServiceChannel[];
  sourceUrl: string;
  verifiedAt: string | null;
}

export interface HelpDirectory {
  defaultCountry: Country;
  countries: Country[];
  services: HelpService[];
}

const DASS21: Record<Locale, Dass21Content> = {
  en: dass21En as Dass21Content,
  id: dass21Id as Dass21Content,
};

const SAFETY_QUESTION: Record<Locale, SafetyQuestionContent> = {
  en: safetyEn as SafetyQuestionContent,
  id: safetyId as SafetyQuestionContent,
};

export const helpDirectory = hotlinesJson as HelpDirectory;

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function isCountry(value: unknown): value is Country {
  return COUNTRIES.includes(value as Country);
}

export function getDass21(locale: Locale): Dass21Content {
  return DASS21[locale];
}

export function getSafetyQuestion(locale: Locale): SafetyQuestionContent {
  return SAFETY_QUESTION[locale];
}

/** Services for one country and category, in the order of the data file. */
export function servicesFor(country: Country, category: ServiceCategory): HelpService[] {
  return helpDirectory.services.filter(
    (service) => service.country === country && service.category === category,
  );
}

/** Placeholder text that is waiting for verified clinical content. */
export function isTodoPlaceholder(text: string): boolean {
  return text.startsWith("TODO(verify)");
}

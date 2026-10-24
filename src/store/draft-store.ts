import type { Locale } from "@/lib/content";
import type { AnswerValue } from "@/lib/scoring";

export type AgeChoice = "adult" | "minor";

/** Age and consent ticked on /mulai before "Mulai" is pressed. */
export interface StartDraft {
  age: AgeChoice | null;
  consent: boolean;
}

interface Tagged<T> {
  value: T;
  /** Interface language the draft was last shown in. */
  locale: Locale;
}

interface Drafts {
  start: Tagged<StartDraft> | null;
  safety: Tagged<AnswerValue> | null;
}

/**
 * Choices made on /mulai and /keamanan but not sent yet. Switching language
 * remounts the page, which would drop them, so a page restores a draft only
 * when it was last shown in the other language; any other visit starts fresh
 * as before. Memory only (gone on reload), and never read by the flow or the
 * crisis gate: a safety answer counts only once it is submitted.
 */
let drafts: Drafts = { start: null, safety: null };

function fromOtherLocale<T>(draft: Tagged<T> | null, locale: Locale): T | null {
  return draft && draft.locale !== locale ? draft.value : null;
}

export function restoreStartDraft(locale: Locale): StartDraft | null {
  return fromOtherLocale(drafts.start, locale);
}

export function saveStartDraft(value: StartDraft, locale: Locale): void {
  drafts = { ...drafts, start: { value, locale } };
}

export function restoreSafetyDraft(locale: Locale): AnswerValue | null {
  return fromOtherLocale(drafts.safety, locale);
}

export function saveSafetyDraft(value: AnswerValue | null, locale: Locale): void {
  drafts = { ...drafts, safety: value === null ? null : { value, locale } };
}

/** On "Mulai", a sent safety answer, or clearing the device. */
export function clearDrafts(): void {
  drafts = { start: null, safety: null };
}

/**
 * Shapes of the decrypted records an account keeps (PRD 15: records.kind).
 * The server only ever sees these encrypted.
 */

import type { Locale } from "@/lib/content";
import type { AnswerValue } from "@/lib/scoring";

/** One finished screening (AK-04, RW-01, PDF-04). */
export interface ScreeningRecord {
  v: 1;
  answers: AnswerValue[];
  safetyAnswer: AnswerValue;
  /** The crisis screen was shown and confirmed for this screening. */
  crisisShown: boolean;
  completedAt: string;
  completedLocale: Locale | null;
}

export const SAFETY_PLAN_SECTIONS = [
  "warningSigns",
  "coping",
  "distraction",
  "people",
  "professionals",
  "safeEnvironment",
] as const;
export type SafetyPlanSection = (typeof SAFETY_PLAN_SECTIONS)[number];

/** The six sections of a safety plan (SP-01), each a short free-text list. */
export interface SafetyPlanRecord {
  v: 1;
  sections: Record<SafetyPlanSection, string>;
  updatedAt: string;
}

/** Mood check-in (RW-04): 1–5 and an optional note, at most once a day. */
export interface CheckinRecord {
  v: 1;
  mood: 1 | 2 | 3 | 4 | 5;
  note: string;
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  at: string;
}

/** Tips the user tried (TP-04): no streaks, no scores. */
export interface TipProgressRecord {
  v: 1;
  tips: Record<string, { tried: boolean; helpful: "yes" | "no" | null }>;
}

export interface RecordTypes {
  screening: ScreeningRecord;
  safety_plan: SafetyPlanRecord;
  checkin: CheckinRecord;
  tip_progress: TipProgressRecord;
}

export type RecordKind = keyof RecordTypes;

export interface StoredRecord<K extends RecordKind = RecordKind> {
  id: string;
  kind: K;
  value: RecordTypes[K];
  createdAt: string;
  updatedAt: string;
}

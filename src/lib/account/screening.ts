/**
 * Converts between the device's flow state and a saved screening record.
 * Scores are never stored: they are recomputed with the same scoring
 * function as the results page (HS-01, K8).
 */

import { createInitialFlowState, isScreeningFinished, type FlowState } from "@/lib/flow";
import { isAnswerValue, scoreDass21, type Dass21Result } from "@/lib/scoring";
import type { ScreeningRecord } from "./types";

/** The device's finished screening as a record, or null when not finished. */
export function screeningRecordFromFlow(state: FlowState): ScreeningRecord | null {
  if (!isScreeningFinished(state) || state.safetyAnswer === null || state.completedAt === null)
    return null;
  const answers = state.answers.filter(isAnswerValue);
  if (answers.length !== state.answers.length) return null;
  return {
    v: 1,
    answers,
    safetyAnswer: state.safetyAnswer,
    crisisShown: state.crisis === "crisis_acknowledged",
    completedAt: state.completedAt,
    completedLocale: state.completedLocale,
  };
}

/**
 * A flow state that reproduces a saved screening, for the report (PDF-04).
 * A positive safety answer without a confirmed crisis screen keeps the
 * crisis gate closed, exactly like a tampered device state would (K3).
 */
export function flowFromScreeningRecord(record: ScreeningRecord): FlowState {
  return {
    ...createInitialFlowState(),
    ageConfirmed: true,
    consentGiven: true,
    answers: [...record.answers],
    safetyAnswer: record.safetyAnswer,
    crisis: record.crisisShown ? "crisis_acknowledged" : "none",
    safetyEverPositive: record.safetyAnswer > 0,
    completedAt: record.completedAt,
    completedLocale: record.completedLocale,
  };
}

/** Scores for a saved screening, or null when the record is malformed. */
export function scoreRecord(record: ScreeningRecord): Dass21Result | null {
  return scoreDass21(record.answers);
}

/** Saved screenings, oldest first. */
export function sortByCompletion<T extends { value: ScreeningRecord }>(records: T[]): T[] {
  return [...records].sort(
    (a, b) => Date.parse(a.value.completedAt) - Date.parse(b.value.completedAt),
  );
}

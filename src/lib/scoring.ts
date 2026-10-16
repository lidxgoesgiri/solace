/**
 * DASS-21 scoring (PRD section 10).
 *
 * Pure functions only. The results page, the PDF report, and the history view
 * must all call `scoreDass21` so every surface shows the same numbers.
 */

export const DASS21_ITEM_COUNT = 21;

export const ANSWER_VALUES = [0, 1, 2, 3] as const;
export type AnswerValue = (typeof ANSWER_VALUES)[number];

export const SUBSCALES = ["depression", "anxiety", "stress"] as const;
export type Subscale = (typeof SUBSCALES)[number];

export const SEVERITIES = [
  "normal",
  "mild",
  "moderate",
  "severe",
  "extremely_severe",
] as const;
export type Severity = (typeof SEVERITIES)[number];

/** 1-based item numbers per subscale, in the original DASS-21 order (PRD 10.1). */
export const SUBSCALE_ITEMS: Readonly<Record<Subscale, readonly number[]>> = {
  depression: [3, 5, 10, 13, 16, 17, 21],
  anxiety: [2, 4, 7, 9, 15, 19, 20],
  stress: [1, 6, 8, 11, 12, 14, 18],
};

/**
 * The single source of truth for DASS-21 cutoffs (Lovibond & Lovibond, 1995),
 * on the ×2 scale (0–42). Each value is the lowest score of that category;
 * "normal" starts at 0. See PRD 10.2.
 */
export const CUTOFFS: Readonly<
  Record<Subscale, Readonly<Record<Exclude<Severity, "normal">, number>>>
> = {
  depression: { mild: 10, moderate: 14, severe: 21, extremely_severe: 28 },
  anxiety: { mild: 8, moderate: 10, severe: 15, extremely_severe: 20 },
  stress: { mild: 15, moderate: 19, severe: 26, extremely_severe: 34 },
};

export const MAX_SUBSCALE_SCORE = 42;

export interface SubscaleResult {
  /** Sum of the 7 item answers (0–21). Never shown in the UI (PRD 10.3). */
  raw: number;
  /** raw × 2 (0–42); this is the score shown to users. */
  score: number;
  severity: Severity;
}

export type Dass21Result = Readonly<Record<Subscale, SubscaleResult>>;

export type Dass21Answers = readonly (AnswerValue | null | undefined)[];

export function isAnswerValue(value: unknown): value is AnswerValue {
  return (
    typeof value === "number" &&
    (ANSWER_VALUES as readonly number[]).includes(value)
  );
}

/** Maps a ×2 subscale score to its category using `CUTOFFS`. */
export function categorize(subscale: Subscale, score: number): Severity {
  if (!Number.isInteger(score) || score < 0 || score > MAX_SUBSCALE_SCORE) {
    throw new RangeError(`Invalid ${subscale} score: ${score}`);
  }
  const cutoffs = CUTOFFS[subscale];
  if (score >= cutoffs.extremely_severe) return "extremely_severe";
  if (score >= cutoffs.severe) return "severe";
  if (score >= cutoffs.moderate) return "moderate";
  if (score >= cutoffs.mild) return "mild";
  return "normal";
}

/** True when all 21 items have a valid answer. */
export function isComplete(answers: Dass21Answers): boolean {
  return (
    answers.length === DASS21_ITEM_COUNT &&
    answers.every((answer) => isAnswerValue(answer))
  );
}

/**
 * Scores a full DASS-21 response.
 *
 * Returns `null` unless all 21 items are answered: there is no imputation
 * (PRD 10.3). Throws on malformed input, which is always a programming error.
 */
export function scoreDass21(answers: Dass21Answers): Dass21Result | null {
  if (answers.length !== DASS21_ITEM_COUNT) {
    throw new RangeError(
      `Expected ${DASS21_ITEM_COUNT} answers, received ${answers.length}`,
    );
  }
  for (const answer of answers) {
    if (answer !== null && answer !== undefined && !isAnswerValue(answer)) {
      throw new RangeError(`Invalid answer value: ${String(answer)}`);
    }
  }
  if (!isComplete(answers)) return null;

  const scoreSubscale = (subscale: Subscale): SubscaleResult => {
    const raw = SUBSCALE_ITEMS[subscale].reduce(
      (sum, itemNumber) => sum + (answers[itemNumber - 1] ?? 0),
      0,
    );
    const score = raw * 2;
    return { raw, score, severity: categorize(subscale, score) };
  };

  return {
    depression: scoreSubscale("depression"),
    anxiety: scoreSubscale("anxiety"),
    stress: scoreSubscale("stress"),
  };
}

/**
 * "Prioritas" escalation trigger from PRD 9.2: extremely severe depression
 * (≥ 28) or extremely severe anxiety (≥ 20). Whether the panel is shown also
 * depends on the safety answer; that decision lives in the flow module.
 */
export function meetsPriorityThreshold(result: Dass21Result): boolean {
  return (
    result.depression.score >= CUTOFFS.depression.extremely_severe ||
    result.anxiety.score >= CUTOFFS.anxiety.extremely_severe
  );
}

/** True when any subscale is severe or extremely severe ("Perhatian", PRD 9.2). */
export function hasSevereSubscale(result: Dass21Result): boolean {
  return SUBSCALES.some((subscale) => {
    const { severity } = result[subscale];
    return severity === "severe" || severity === "extremely_severe";
  });
}

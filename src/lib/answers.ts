/**
 * DASS-21 answer basics (PRD 10.3): the item count and what counts as a
 * valid answer. Kept apart from scoring so the flow's router guard, which
 * runs on every page, does not bundle the cutoffs.
 */

export const DASS21_ITEM_COUNT = 21;

export const ANSWER_VALUES = [0, 1, 2, 3] as const;
export type AnswerValue = (typeof ANSWER_VALUES)[number];

export type Dass21Answers = readonly (AnswerValue | null | undefined)[];

export function isAnswerValue(value: unknown): value is AnswerValue {
  return typeof value === "number" && (ANSWER_VALUES as readonly number[]).includes(value);
}

/** True when all 21 items have a valid answer. */
export function isComplete(answers: Dass21Answers): boolean {
  return answers.length === DASS21_ITEM_COUNT && answers.every((answer) => isAnswerValue(answer));
}

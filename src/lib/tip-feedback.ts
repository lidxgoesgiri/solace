/**
 * What Solace says after the user tells whether a tip helped (TP-04). The
 * words fit the kind of activity, so a breathing exercise and a journaling
 * prompt are not answered alike. The messages are local (messages/*.json,
 * `tips.feedback`): instant, and no AI. They acknowledge the effort and the
 * user's own report, and never claim the user is better.
 */

export const FEEDBACK_KINDS = [
  "activity",
  "movement",
  "connection",
  "breathing",
  "worry",
  "grounding",
  "problemSolving",
  "thoughts",
  "rest",
  "selfCompassion",
  "mindfulness",
  "relaxation",
  "journaling",
  "general",
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

const KIND_OF_TIP: Readonly<Record<string, FeedbackKind>> = {
  "ba-small-activity": "activity",
  "physical-activity": "movement",
  "reconnect-one-person": "connection",
  "slow-breathing": "breathing",
  "worry-time": "worry",
  grounding: "grounding",
  "problem-solving": "problemSolving",
  unhook: "thoughts",
  "sleep-routine": "rest",
  "self-compassion": "selfCompassion",
  "mindful-minutes": "mindfulness",
  "muscle-relaxation": "relaxation",
  "name-feelings": "journaling",
};

/** The kind of activity a tip is; "general" for a tip not mapped yet. */
export function feedbackKind(tipId: string): FeedbackKind {
  return KIND_OF_TIP[tipId] ?? "general";
}

/** The toolkit exercise on the same page that repeats this kind of tip. */
export type ToolkitExercise = "breathing" | "grounding" | "relaxation";

export function toolkitExerciseFor(kind: FeedbackKind): ToolkitExercise | null {
  return kind === "breathing" || kind === "grounding" || kind === "relaxation" ? kind : null;
}

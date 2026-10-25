import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import id from "../../messages/id.json";
import { FEEDBACK_KINDS, feedbackKind, toolkitExerciseFor } from "./tip-feedback";
import { TIPS } from "./tips";

const LOCALES = { id, en } as const;

describe("feedback after a tip (TP-04)", () => {
  it("every library tip has its own kind of activity", () => {
    for (const tip of TIPS) {
      expect(feedbackKind(tip.id), tip.id).not.toBe("general");
    }
    expect(feedbackKind("a-tip-added-later")).toBe("general");
  });

  it("has a reply for both answers in both languages, different for each kind", () => {
    for (const [locale, messages] of Object.entries(LOCALES)) {
      const { helpful, notHelpful, tryAnotherHint } = messages.tips.feedback;
      for (const replies of [helpful, notHelpful] as Record<string, string>[]) {
        for (const kind of FEEDBACK_KINDS) {
          expect(replies[kind]?.trim().length ?? 0, `${locale} ${kind}`).toBeGreaterThan(0);
        }
        expect(new Set(Object.values(replies)).size, locale).toBe(FEEDBACK_KINDS.length);
      }
      expect(tryAnotherHint.length).toBeGreaterThan(0);
    }
  });

  it("acknowledges the effort without claiming the user is better, in a calm tone (PRD 17)", () => {
    for (const messages of Object.values(LOCALES)) {
      const replies = [...Object.values(messages.tips.feedback.helpful), ...Object.values(messages.tips.feedback.notHelpful)];
      for (const reply of replies) {
        expect(reply).not.toMatch(/sembuh|pulih|membaik|lebih baik sekarang|cured|recovered|healed|you are better|you're better|feel better now/i);
        expect(reply).not.toMatch(/!|\p{Extended_Pictographic}/u);
      }
    }
  });

  it("links back to the toolkit only for tips the toolkit repeats", () => {
    expect(toolkitExerciseFor(feedbackKind("slow-breathing"))).toBe("breathing");
    expect(toolkitExerciseFor(feedbackKind("grounding"))).toBe("grounding");
    expect(toolkitExerciseFor(feedbackKind("muscle-relaxation"))).toBe("relaxation");
    for (const tip of TIPS.filter((tip) => !["slow-breathing", "grounding", "muscle-relaxation"].includes(tip.id))) {
      expect(toolkitExerciseFor(feedbackKind(tip.id)), tip.id).toBeNull();
    }
    for (const messages of Object.values(LOCALES)) {
      expect(Object.keys(messages.tips.feedback.toolkit).sort()).toEqual(["breathing", "grounding", "relaxation"]);
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  CUTOFFS,
  DASS21_ITEM_COUNT,
  SUBSCALES,
  SUBSCALE_ITEMS,
  categorize,
  hasSevereSubscale,
  isComplete,
  meetsPriorityThreshold,
  scoreDass21,
  type AnswerValue,
  type Severity,
  type Subscale,
} from "./scoring";

/**
 * Builds a complete answer set whose raw subscale sums equal `raw`.
 * Each subscale's 7 items are filled with 3s first, then the remainder.
 */
function answersWithRaw(raw: Partial<Record<Subscale, number>>): AnswerValue[] {
  const answers: AnswerValue[] = Array.from({ length: DASS21_ITEM_COUNT }, () => 0);
  for (const subscale of SUBSCALES) {
    let remaining = raw[subscale] ?? 0;
    if (remaining < 0 || remaining > 21) throw new Error("raw out of range");
    for (const itemNumber of SUBSCALE_ITEMS[subscale]) {
      const value = Math.min(3, remaining) as AnswerValue;
      answers[itemNumber - 1] = value;
      remaining -= value;
    }
  }
  return answers;
}

/** Builds answers that produce a ×2 score of `score` on one subscale (must be even). */
function answersWithScore(subscale: Subscale, score: number): AnswerValue[] {
  if (score % 2 !== 0) throw new Error("×2 scores are always even");
  return answersWithRaw({ [subscale]: score / 2 });
}

describe("item mapping (PRD 10.1)", () => {
  it("matches the official DASS-21 subscale items exactly", () => {
    expect(SUBSCALE_ITEMS).toEqual({
      depression: [3, 5, 10, 13, 16, 17, 21],
      anxiety: [2, 4, 7, 9, 15, 19, 20],
      stress: [1, 6, 8, 11, 12, 14, 18],
    });
  });

  it("assigns every item 1–21 to exactly one subscale", () => {
    const all = SUBSCALES.flatMap((subscale) => SUBSCALE_ITEMS[subscale]);
    expect(all).toHaveLength(DASS21_ITEM_COUNT);
    expect([...all].sort((a, b) => a - b)).toEqual(
      Array.from({ length: DASS21_ITEM_COUNT }, (_, i) => i + 1),
    );
  });

  it.each(Array.from({ length: DASS21_ITEM_COUNT }, (_, i) => i + 1))(
    "item %i only counts toward its own subscale",
    (itemNumber) => {
      const answers: AnswerValue[] = Array.from({ length: DASS21_ITEM_COUNT }, () => 0);
      answers[itemNumber - 1] = 3;
      const result = scoreDass21(answers);
      const owner = SUBSCALES.find((s) => SUBSCALE_ITEMS[s].includes(itemNumber));
      for (const subscale of SUBSCALES) {
        expect(result?.[subscale].raw).toBe(subscale === owner ? 3 : 0);
      }
    },
  );

  it("fails when items are swapped between subscales", () => {
    // Answer 3 only on depression items: anxiety and stress must stay at 0.
    const result = scoreDass21(answersWithRaw({ depression: 21 }));
    expect(result?.depression.score).toBe(42);
    expect(result?.anxiety.score).toBe(0);
    expect(result?.stress.score).toBe(0);
  });
});

describe("cutoffs (PRD 10.2)", () => {
  it("is stored as one constant on the ×2 scale", () => {
    expect(CUTOFFS).toEqual({
      depression: { mild: 10, moderate: 14, severe: 21, extremely_severe: 28 },
      anxiety: { mild: 8, moderate: 10, severe: 15, extremely_severe: 20 },
      stress: { mild: 15, moderate: 19, severe: 26, extremely_severe: 34 },
    });
  });
});

describe("categorize: both sides of every boundary (PRD 10.4)", () => {
  const cases: [Subscale, number, Severity][] = [
    ["depression", 9, "normal"],
    ["depression", 10, "mild"],
    ["depression", 13, "mild"],
    ["depression", 14, "moderate"],
    ["depression", 20, "moderate"],
    ["depression", 21, "severe"],
    ["depression", 27, "severe"],
    ["depression", 28, "extremely_severe"],
    ["anxiety", 7, "normal"],
    ["anxiety", 8, "mild"],
    ["anxiety", 9, "mild"],
    ["anxiety", 10, "moderate"],
    ["anxiety", 14, "moderate"],
    ["anxiety", 15, "severe"],
    ["anxiety", 19, "severe"],
    ["anxiety", 20, "extremely_severe"],
    ["stress", 14, "normal"],
    ["stress", 15, "mild"],
    ["stress", 18, "mild"],
    ["stress", 19, "moderate"],
    ["stress", 25, "moderate"],
    ["stress", 26, "severe"],
    ["stress", 33, "severe"],
    ["stress", 34, "extremely_severe"],
  ];

  it.each(cases)("%s score %i → %s", (subscale, score, severity) => {
    expect(categorize(subscale, score)).toBe(severity);
  });

  it.each(SUBSCALES)("%s: 0 is normal and 42 is extremely severe", (subscale) => {
    expect(categorize(subscale, 0)).toBe("normal");
    expect(categorize(subscale, 42)).toBe("extremely_severe");
  });

  it("rejects scores outside 0–42", () => {
    expect(() => categorize("depression", -1)).toThrow(RangeError);
    expect(() => categorize("anxiety", 43)).toThrow(RangeError);
    expect(() => categorize("stress", 1.5)).toThrow(RangeError);
  });
});

describe("scoreDass21: reachable scores around each boundary", () => {
  // ×2 scores are always even, so these are the nearest reachable values
  // on each side of the PRD 10.4 boundaries.
  const cases: [Subscale, number, Severity][] = [
    ["depression", 8, "normal"],
    ["depression", 10, "mild"],
    ["depression", 12, "mild"],
    ["depression", 14, "moderate"],
    ["depression", 20, "moderate"],
    ["depression", 22, "severe"],
    ["depression", 26, "severe"],
    ["depression", 28, "extremely_severe"],
    ["anxiety", 6, "normal"],
    ["anxiety", 8, "mild"],
    ["anxiety", 10, "moderate"],
    ["anxiety", 14, "moderate"],
    ["anxiety", 16, "severe"],
    ["anxiety", 18, "severe"],
    ["anxiety", 20, "extremely_severe"],
    ["stress", 14, "normal"],
    ["stress", 16, "mild"],
    ["stress", 18, "mild"],
    ["stress", 20, "moderate"],
    ["stress", 24, "moderate"],
    ["stress", 26, "severe"],
    ["stress", 32, "severe"],
    ["stress", 34, "extremely_severe"],
  ];

  it.each(cases)("%s score %i → %s", (subscale, score, severity) => {
    const result = scoreDass21(answersWithScore(subscale, score));
    expect(result?.[subscale]).toEqual({ raw: score / 2, score, severity });
  });

  it("all answers 0 → every subscale scores 0 (normal)", () => {
    const result = scoreDass21(Array.from({ length: 21 }, () => 0 as const));
    for (const subscale of SUBSCALES) {
      expect(result?.[subscale]).toEqual({ raw: 0, score: 0, severity: "normal" });
    }
  });

  it("all answers 3 → every subscale scores 42 (extremely severe)", () => {
    const result = scoreDass21(Array.from({ length: 21 }, () => 3 as const));
    for (const subscale of SUBSCALES) {
      expect(result?.[subscale]).toEqual({
        raw: 21,
        score: 42,
        severity: "extremely_severe",
      });
    }
  });

  it("doubles the raw sum", () => {
    const result = scoreDass21(answersWithRaw({ depression: 7, anxiety: 5, stress: 9 }));
    expect(result?.depression).toMatchObject({ raw: 7, score: 14 });
    expect(result?.anxiety).toMatchObject({ raw: 5, score: 10 });
    expect(result?.stress).toMatchObject({ raw: 9, score: 18 });
  });
});

describe("scoreDass21: completeness and validation (PRD 10.3)", () => {
  it("returns null when any item is unanswered (no imputation)", () => {
    const answers: (AnswerValue | null)[] = answersWithRaw({ stress: 10 });
    answers[20] = null;
    expect(scoreDass21(answers)).toBeNull();
    expect(isComplete(answers)).toBe(false);
  });

  it("returns null for a fresh, empty response", () => {
    expect(scoreDass21(Array.from({ length: 21 }, () => null))).toBeNull();
  });

  it("throws when the answer array is not 21 long", () => {
    expect(() => scoreDass21([0, 1, 2])).toThrow(RangeError);
    expect(() => scoreDass21(Array.from({ length: 22 }, () => 0 as const))).toThrow(
      RangeError,
    );
  });

  it("throws on values outside 0–3", () => {
    const answers = answersWithRaw({}) as number[];
    answers[4] = 4;
    expect(() => scoreDass21(answers as AnswerValue[])).toThrow(RangeError);
  });
});

describe("escalation thresholds (PRD 9.2)", () => {
  it("depression ≥ 28 meets the Prioritas threshold", () => {
    expect(meetsPriorityThreshold(scoreDass21(answersWithScore("depression", 28))!)).toBe(
      true,
    );
    expect(meetsPriorityThreshold(scoreDass21(answersWithScore("depression", 26))!)).toBe(
      false,
    );
  });

  it("anxiety ≥ 20 meets the Prioritas threshold", () => {
    expect(meetsPriorityThreshold(scoreDass21(answersWithScore("anxiety", 20))!)).toBe(
      true,
    );
    expect(meetsPriorityThreshold(scoreDass21(answersWithScore("anxiety", 18))!)).toBe(
      false,
    );
  });

  it("extremely severe stress alone does not meet the Prioritas threshold", () => {
    expect(meetsPriorityThreshold(scoreDass21(answersWithScore("stress", 42))!)).toBe(
      false,
    );
  });

  it("detects any severe subscale (Perhatian)", () => {
    expect(hasSevereSubscale(scoreDass21(answersWithScore("stress", 26))!)).toBe(true);
    expect(hasSevereSubscale(scoreDass21(answersWithScore("stress", 24))!)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { isTodoPlaceholder } from "./content";
import { SEVERITIES, SUBSCALES, scoreDass21, type Severity } from "./scoring";
import {
  MAX_TIPS,
  TIPS,
  alternativesFor,
  categoriesOf,
  choicesFromProgress,
  planTips,
  replaceTip,
  restoreTip,
  selectTips,
  slotOf,
  type Categories,
} from "./tips";

const rank = (severity: Severity) => SEVERITIES.indexOf(severity);

/** All 125 combinations of the three categories. */
const ALL: Categories[] = SEVERITIES.flatMap((depression) =>
  SEVERITIES.flatMap((anxiety) => SEVERITIES.map((stress) => ({ depression, anxiety, stress }))),
);

describe("tip library (PRD 11.1, TP-02, K10)", () => {
  it("every tip has text in both languages, steps, and at least one linked source", () => {
    for (const tip of TIPS) {
      for (const locale of ["id", "en"] as const) {
        expect(tip.title[locale].length, tip.id).toBeGreaterThan(0);
        expect(tip.body[locale].length, tip.id).toBeGreaterThan(0);
        expect(tip.howTo[locale].length, tip.id).toBeGreaterThan(0);
        expect(tip.evidence.summary[locale].length, tip.id).toBeGreaterThan(0);
      }
      expect(tip.howTo.id).toHaveLength(tip.howTo.en.length);
      expect(tip.evidence.sources.length, tip.id).toBeGreaterThan(0);
      for (const source of tip.evidence.sources) {
        expect(source.url, tip.id).toMatch(
          /^https:\/\/(doi\.org|www\.who\.int|iris\.who\.int|www\.nice\.org\.uk)\//,
        );
        expect(source.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("has unique ids, valid dimensions and categories", () => {
    expect(new Set(TIPS.map((tip) => tip.id)).size).toBe(TIPS.length);
    for (const tip of TIPS) {
      expect(tip.dimensions.every((d) => SUBSCALES.includes(d))).toBe(true);
      expect(tip.severity.every((s) => SEVERITIES.includes(s))).toBe(true);
    }
  });

  it("every evidence summary is written, in both languages", () => {
    for (const tip of TIPS) {
      for (const locale of ["id", "en"] as const) {
        expect(isTodoPlaceholder(tip.evidence.summary[locale]), `${tip.id} ${locale}`).toBe(false);
      }
    }
  });

  it("has enough tips for every elevated category and for wellbeing", () => {
    for (const subscale of SUBSCALES) {
      for (const severity of SEVERITIES.slice(1)) {
        const matching = TIPS.filter(
          (tip) => tip.dimensions.includes(subscale) && tip.severity.includes(severity),
        );
        expect(matching.length, `${subscale} ${severity}`).toBeGreaterThanOrEqual(3);
      }
    }
    expect(TIPS.filter((tip) => tip.severity.includes("normal")).length).toBeGreaterThanOrEqual(3);
  });
});

describe("selectTips holds for all 125 category combinations (TP-01, K10)", () => {
  it.each(ALL.map((c) => [`${c.depression}/${c.anxiety}/${c.stress}`, c] as const))(
    "%s",
    (_, categories) => {
      const plan = selectTips(categories);
      const tips = planTips(plan);
      const elevated = SUBSCALES.filter((s) => categories[s] !== "normal");

      // Rule 3 and no duplicates.
      expect(tips.length).toBeLessThanOrEqual(MAX_TIPS);
      expect(new Set(tips.map((tip) => tip.id)).size).toBe(tips.length);

      if (elevated.length === 0) {
        // Rule 5.
        expect(plan.mode).toBe("wellbeing");
        expect(plan.wellbeing).toHaveLength(3);
        expect(plan.wellbeing.every((tip) => tip.severity.includes("normal"))).toBe(true);
        expect(plan.professionalFirst).toBe(false);
        return;
      }

      expect(plan.mode).toBe("targeted");
      // Rule 1: one group per elevated subscale, most severe first, ties in D → A → S order.
      expect(plan.groups.map((g) => g.subscale).sort()).toEqual([...elevated].sort());
      for (let i = 1; i < plan.groups.length; i += 1) {
        const prev = plan.groups[i - 1]!;
        const next = plan.groups[i]!;
        const diff = rank(prev.severity) - rank(next.severity);
        expect(diff).toBeGreaterThanOrEqual(0);
        if (diff === 0)
          expect(SUBSCALES.indexOf(prev.subscale)).toBeLessThan(SUBSCALES.indexOf(next.subscale));
      }
      // Rule 2: up to 3 matching tips per subscale, and every elevated subscale gets some.
      for (const group of plan.groups) {
        expect(group.tips.length).toBeGreaterThan(0);
        expect(group.tips.length).toBeLessThanOrEqual(3);
        for (const tip of group.tips) {
          expect(tip.dimensions).toContain(group.subscale);
          expect(tip.severity).toContain(group.severity);
        }
      }
      // Rule 4.
      expect(plan.professionalFirst).toBe(
        elevated.some((s) => rank(categories[s]) >= rank("severe")),
      );
      // TP-02: every shown tip links a source.
      expect(tips.every((tip) => tip.evidence.sources.length > 0)).toBe(true);
    },
  );
});

describe("selectTips examples", () => {
  it("a tip for several dimensions appears once, under the most severe", () => {
    const plan = selectTips({ depression: "normal", anxiety: "mild", stress: "extremely_severe" });
    expect(plan.groups.map((g) => g.subscale)).toEqual(["stress", "anxiety"]);
    const stress = plan.groups[0]!.tips.map((tip) => tip.id);
    expect(stress).toContain("sleep-routine");
    expect(plan.groups[1]!.tips.map((tip) => tip.id)).not.toContain("sleep-routine");
  });

  it("ties follow depression → anxiety → stress", () => {
    const plan = selectTips({ depression: "moderate", anxiety: "moderate", stress: "moderate" });
    expect(plan.groups.map((g) => g.subscale)).toEqual(["depression", "anxiety", "stress"]);
    expect(plan.groups.map((g) => g.tips.length)).toEqual([2, 2, 2]);
  });

  it("two elevated subscales get up to 3 tips each", () => {
    const plan = selectTips({ depression: "mild", anxiety: "severe", stress: "normal" });
    expect(plan.groups.map((g) => [g.subscale, g.tips.length])).toEqual([
      ["anxiety", 3],
      ["depression", 3],
    ]);
    expect(plan.professionalFirst).toBe(true);
  });

  it("uses the same categories as the results page", () => {
    const result = scoreDass21(Array(21).fill(1))!;
    expect(categoriesOf(result)).toEqual({
      depression: "moderate",
      anxiety: "moderate",
      stress: "normal",
    });
    expect(selectTips(categoriesOf(result)).groups.map((g) => g.subscale)).toEqual([
      "depression",
      "anxiety",
    ]);
  });
});

const ids = (tips: readonly { id: string }[]) => tips.map((tip) => tip.id);

describe("swapping a tip that did not help (TP-04, K10)", () => {
  it.each(ALL.map((c) => [`${c.depression}/${c.anxiety}/${c.stress}`, c] as const))(
    "%s: each swap stays in its section, changes nothing else, and can be undone",
    (_, categories) => {
      const before = selectTips(categories);
      const shown = ids(planTips(before));
      for (const tipId of shown) {
        const slot = slotOf(before, tipId)!;
        const alternatives = alternativesFor(tipId, categories);
        for (const tip of alternatives) {
          expect(shown).not.toContain(tip.id);
          if (slot === "wellbeing") expect(tip.severity).toContain("normal");
          else {
            expect(tip.dimensions).toContain(slot);
            expect(tip.severity).toContain(categories[slot]);
          }
        }
        if (alternatives.length === 0) continue;

        const replacement = alternatives[0]!.id;
        const progress = replaceTip({}, tipId, replacement, slot);
        const after = selectTips(categories, TIPS, choicesFromProgress(progress));
        expect(slotOf(after, replacement)).toBe(slot);
        expect(ids(planTips(after)).sort()).toEqual(
          [...shown.filter((id) => id !== tipId), replacement].sort(),
        );

        const restored = selectTips(categories, TIPS, choicesFromProgress(restoreTip(progress, tipId)));
        expect(ids(planTips(restored)).sort()).toEqual([...shown].sort());
        expect(slotOf(restored, tipId)).toBe(slot);
      }
    },
  );

  it("every shown tip has another tip to try when one subscale is elevated", () => {
    for (const subscale of SUBSCALES) {
      for (const severity of SEVERITIES.slice(1)) {
        const categories = { depression: "normal", anxiety: "normal", stress: "normal", [subscale]: severity } as Categories;
        for (const tip of planTips(selectTips(categories))) {
          expect(alternativesFor(tip.id, categories).length, `${subscale} ${severity} ${tip.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("a chain of swaps is undone from its start", () => {
    const categories: Categories = { depression: "moderate", anxiety: "normal", stress: "normal" };
    const plan = selectTips(categories);
    const first = plan.groups[0]!.tips[0]!.id;
    const [second, third] = ids(alternativesFor(first, categories));
    if (!second || !third) return;
    let progress = replaceTip({}, first, second, "depression");
    progress = replaceTip(progress, second, third, "depression");
    const swapped = ids(planTips(selectTips(categories, TIPS, choicesFromProgress(progress))));
    expect(swapped).toContain(third);
    expect(swapped).not.toContain(first);
    expect(swapped).not.toContain(second);

    const back = ids(planTips(selectTips(categories, TIPS, choicesFromProgress(restoreTip(progress, first)))));
    expect(back.sort()).toEqual(ids(planTips(plan)).sort());
    expect(back).not.toContain(second);
  });

  it("reads saved choices defensively", () => {
    const choices = choicesFromProgress({
      "not-a-tip": { tried: true, helpful: "no", replacedBy: "grounding" },
      grounding: { tried: false, helpful: null, chosenFor: "nonsense" as never },
      "worry-time": { tried: true, helpful: "no", replacedBy: "grounding" },
    });
    expect([...choices.replaced]).toEqual(["worry-time"]);
    expect(choices.chosen.size).toBe(0);
  });

  it("keeps the tried and helpful notes when swapping and restoring", () => {
    const progress = replaceTip({ grounding: { tried: true, helpful: "no" } }, "grounding", "worry-time", "anxiety");
    expect(progress.grounding).toEqual({ tried: true, helpful: "no", replacedBy: "worry-time" });
    expect(restoreTip(progress, "grounding").grounding).toEqual({ tried: true, helpful: "no", chosenFor: "anxiety" });
  });
});

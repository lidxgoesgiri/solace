/**
 * Evidence-based tips (PRD 11) and the rules that pick them (TP-01, K10).
 * `selectTips` is a pure function of the three DASS-21 categories.
 */

import tipsJson from "@/data/tips.json";
import type { Locale } from "./content";
import { SEVERITIES, SUBSCALES, type Dass21Result, type Severity, type Subscale } from "./scoring";

export type EvidenceLevel = "strong" | "moderate" | "guideline";

export interface TipSource {
  label: string;
  url: string;
}

export interface Tip {
  id: string;
  dimensions: Subscale[];
  /** Categories the tip is meant for; "normal" marks a wellbeing tip. */
  severity: Severity[];
  evidenceLevel: EvidenceLevel;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  howTo: Record<Locale, string[]>;
  evidence: { summary: Record<Locale, string>; sources: TipSource[] };
  reviewedBy: string;
  reviewedAt: string | null;
}

export const TIPS: readonly Tip[] = (tipsJson as { tips: Tip[] }).tips;

export const MAX_TIPS = 6;
export const MAX_TIPS_PER_SUBSCALE = 3;
export const WELLBEING_TIP_COUNT = 3;

export type Categories = Record<Subscale, Severity>;

export interface TipGroup {
  subscale: Subscale;
  severity: Severity;
  tips: Tip[];
}

export interface TipPlan {
  /** "wellbeing" when every subscale is normal (rule 5). */
  mode: "targeted" | "wellbeing";
  /** Elevated subscales, most severe first, each with its tips (rules 1–3). */
  groups: TipGroup[];
  /** Wellbeing tips when everything is normal. */
  wellbeing: Tip[];
  /**
   * Any subscale severe or extremely severe: the professional-help card
   * comes first and tips are labelled as companions (rule 4, TP-03).
   */
  professionalFirst: boolean;
}

export function categoriesOf(result: Dass21Result): Categories {
  return {
    depression: result.depression.severity,
    anxiety: result.anxiety.severity,
    stress: result.stress.severity,
  };
}

const rank = (severity: Severity) => SEVERITIES.indexOf(severity);

/**
 * PRD 11.2:
 * 1. Every subscale at mild or above, most severe first; ties go
 *    depression → anxiety → stress.
 * 2. Up to 3 tips per subscale matching its dimension and category. A tip
 *    for several dimensions appears once, under the most severe one. With
 *    all three subscales elevated, each gets 2, so none is left without tips.
 * 3. At most 6 tips in total.
 * 4. Severe or extremely severe anywhere: professional help first.
 * 5. All normal: 3 wellbeing tips (and an invitation to screen again).
 */
export function selectTips(categories: Categories, library: readonly Tip[] = TIPS): TipPlan {
  const elevated = SUBSCALES.filter((subscale) => categories[subscale] !== "normal").sort(
    (a, b) =>
      rank(categories[b]) - rank(categories[a]) || SUBSCALES.indexOf(a) - SUBSCALES.indexOf(b),
  );

  if (elevated.length === 0) {
    return {
      mode: "wellbeing",
      groups: [],
      wellbeing: library
        .filter((tip) => tip.severity.includes("normal"))
        .slice(0, WELLBEING_TIP_COUNT),
      professionalFirst: false,
    };
  }

  const perSubscale = Math.min(MAX_TIPS_PER_SUBSCALE, Math.floor(MAX_TIPS / elevated.length));
  const used = new Set<string>();
  const groups: TipGroup[] = elevated.map((subscale) => {
    const severity = categories[subscale];
    const tips = library
      .filter(
        (tip) =>
          !used.has(tip.id) && tip.dimensions.includes(subscale) && tip.severity.includes(severity),
      )
      .slice(0, perSubscale);
    for (const tip of tips) used.add(tip.id);
    return { subscale, severity, tips };
  });

  return {
    mode: "targeted",
    groups,
    wellbeing: [],
    professionalFirst: elevated.some((subscale) => rank(categories[subscale]) >= rank("severe")),
  };
}

/** All tips of a plan, in display order. */
export function planTips(plan: TipPlan): Tip[] {
  return plan.mode === "wellbeing" ? plan.wellbeing : plan.groups.flatMap((group) => group.tips);
}

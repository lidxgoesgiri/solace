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

/** A section of the plan: an elevated subscale, or the wellbeing tips. */
export type TipSlot = Subscale | "wellbeing";

/**
 * The user's own changes to the plan (TP-04): tips they replaced because
 * they did not help, and the tips they took instead, each kept in the
 * section it was chosen for. Chosen tips still have to match that
 * section's subscale and category (K10).
 */
export interface TipChoices {
  replaced: ReadonlySet<string>;
  chosen: ReadonlyMap<string, TipSlot>;
}

export const NO_CHOICES: TipChoices = { replaced: new Set(), chosen: new Map() };

/** What the account stores per tip (TP-04): no streaks, no scores. */
export interface TipProgressEntry {
  tried: boolean;
  helpful: "yes" | "no" | null;
  /** Set when the user replaced this tip; the id of the tip that took its place. */
  replacedBy?: string;
  /** Set when the user chose this tip in place of another one. */
  chosenFor?: TipSlot;
}

const isSlot = (value: unknown): value is TipSlot =>
  value === "wellbeing" || SUBSCALES.includes(value as Subscale);

/** The choices saved in the account, ignoring tips the library no longer has. */
export function choicesFromProgress(
  progress: Readonly<Record<string, TipProgressEntry>>,
  library: readonly Tip[] = TIPS,
): TipChoices {
  const known = new Set(library.map((tip) => tip.id));
  const replaced = new Set<string>();
  const chosen = new Map<string, TipSlot>();
  for (const [id, entry] of Object.entries(progress)) {
    if (!known.has(id)) continue;
    if (typeof entry.replacedBy === "string") replaced.add(id);
    if (isSlot(entry.chosenFor)) chosen.set(id, entry.chosenFor);
  }
  return { replaced, chosen };
}

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
 *
 * With `choices`, replaced tips are left out and chosen tips come first in
 * the section they were chosen for; the rules above still hold.
 */
export function selectTips(
  categories: Categories,
  library: readonly Tip[] = TIPS,
  choices: TipChoices = NO_CHOICES,
): TipPlan {
  const elevated = SUBSCALES.filter((subscale) => categories[subscale] !== "normal").sort(
    (a, b) =>
      rank(categories[b]) - rank(categories[a]) || SUBSCALES.indexOf(a) - SUBSCALES.indexOf(b),
  );
  const active: TipSlot[] = elevated.length === 0 ? ["wellbeing"] : elevated;

  /** Tips for one section: chosen ones first, then library order. */
  const forSlot = (slot: TipSlot, fits: (tip: Tip) => boolean): Tip[] => {
    const available = library.filter((tip) => !choices.replaced.has(tip.id) && fits(tip));
    const chosenHere = available.filter((tip) => choices.chosen.get(tip.id) === slot);
    const others = available.filter((tip) => {
      const chosenFor = choices.chosen.get(tip.id);
      return chosenFor === undefined || (chosenFor !== slot && !active.includes(chosenFor));
    });
    return [...chosenHere, ...others];
  };

  if (elevated.length === 0) {
    return {
      mode: "wellbeing",
      groups: [],
      wellbeing: forSlot("wellbeing", (tip) => tip.severity.includes("normal")).slice(
        0,
        WELLBEING_TIP_COUNT,
      ),
      professionalFirst: false,
    };
  }

  const perSubscale = Math.min(MAX_TIPS_PER_SUBSCALE, Math.floor(MAX_TIPS / elevated.length));
  const used = new Set<string>();
  const groups: TipGroup[] = elevated.map((subscale) => {
    const severity = categories[subscale];
    const tips = forSlot(
      subscale,
      (tip) => tip.dimensions.includes(subscale) && tip.severity.includes(severity),
    )
      .filter((tip) => !used.has(tip.id))
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

/** The section a shown tip belongs to, or null when it is not in the plan. */
export function slotOf(plan: TipPlan, tipId: string): TipSlot | null {
  if (plan.mode === "wellbeing") {
    return plan.wellbeing.some((tip) => tip.id === tipId) ? "wellbeing" : null;
  }
  return plan.groups.find((group) => group.tips.some((tip) => tip.id === tipId))?.subscale ?? null;
}

/**
 * Library tips that can take the place of a tip that did not help: they fit
 * the same section (subscale and category, or wellbeing), are not already in
 * the plan, and were not replaced before. Empty when the library has nothing
 * else for that section.
 */
export function alternativesFor(
  tipId: string,
  categories: Categories,
  choices: TipChoices = NO_CHOICES,
  library: readonly Tip[] = TIPS,
): Tip[] {
  const plan = selectTips(categories, library, choices);
  const slot = slotOf(plan, tipId);
  if (slot === null) return [];
  const shown = new Set(planTips(plan).map((tip) => tip.id));
  const fits = (tip: Tip) =>
    slot === "wellbeing"
      ? tip.severity.includes("normal")
      : tip.dimensions.includes(slot) && tip.severity.includes(categories[slot]);
  return library.filter(
    (tip) => !shown.has(tip.id) && !choices.replaced.has(tip.id) && fits(tip),
  );
}

type Progress = Readonly<Record<string, TipProgressEntry>>;

const NO_ENTRY: TipProgressEntry = { tried: false, helpful: null };

/** Progress after the user swaps `tipId` for `replacementId` in `slot`. */
export function replaceTip(
  progress: Progress,
  tipId: string,
  replacementId: string,
  slot: TipSlot,
): Record<string, TipProgressEntry> {
  return {
    ...progress,
    [tipId]: { ...(progress[tipId] ?? NO_ENTRY), replacedBy: replacementId },
    [replacementId]: { ...(progress[replacementId] ?? NO_ENTRY), chosenFor: slot },
  };
}

/**
 * Progress after the user brings a replaced tip back. The tip standing in
 * for it now (the last of a chain of swaps) gives its place back, so the
 * restored tip shows where it was.
 */
export function restoreTip(progress: Progress, tipId: string): Record<string, TipProgressEntry> {
  const entry = progress[tipId];
  if (!entry?.replacedBy) return { ...progress };
  const { replacedBy, ...rest } = entry;
  const next: Record<string, TipProgressEntry> = { ...progress, [tipId]: rest };

  let standIn = replacedBy;
  const seen = new Set([tipId]);
  while (progress[standIn]?.replacedBy && !seen.has(standIn)) {
    seen.add(standIn);
    standIn = progress[standIn]!.replacedBy!;
  }
  const holder = progress[standIn];
  if (holder?.chosenFor !== undefined && !holder.replacedBy) {
    const { chosenFor, ...kept } = holder;
    next[standIn] = kept;
    next[tipId] = { ...rest, chosenFor };
  }
  return next;
}

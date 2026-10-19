/**
 * Risk check before AI (PRD 20.3, AI-02, Safety Contract A2). Text the user
 * types is matched against a list of risk phrases in Indonesian and English
 * before anything is sent to an AI provider; a match opens the crisis
 * screen instead. The list is clinical content: it comes from
 * src/data/risk-phrases.json, drafted from published instruments (PHQ-9
 * item 9, the C-SSRS screener, the Kemenkes warning signs) and approved by
 * the project owner. Until it is marked verified, the AI features stay off.
 */

import riskPhrases from "@/data/risk-phrases.json";

export interface RiskList {
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  phrases: { id: string[]; en: string[] };
  /** Ordinary sentences that must never match (tested when the list is filled). */
  neutralExamples: { id: string[]; en: string[] };
}

export const RISK_LIST = riskPhrases as RiskList;

/** Lower case, compatibility forms folded, punctuation and spacing collapsed. */
export function normalizeForRisk(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** True when the text contains any listed phrase as whole words. */
export function containsRiskPhrase(text: string, list: RiskList = RISK_LIST): boolean {
  const haystack = ` ${normalizeForRisk(text)} `;
  for (const phrase of [...list.phrases.id, ...list.phrases.en]) {
    const needle = normalizeForRisk(phrase);
    if (needle && haystack.includes(` ${needle} `)) return true;
  }
  return false;
}

/** The list has been reviewed and filled in both languages (A2 precondition). */
export function riskListReady(list: RiskList = RISK_LIST): boolean {
  return (
    list.status === "verified" &&
    Boolean(list.reviewedBy) &&
    list.phrases.id.length > 0 &&
    list.phrases.en.length > 0
  );
}

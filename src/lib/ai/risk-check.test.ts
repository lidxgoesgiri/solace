import { describe, expect, it } from "vitest";
import { DEFAULT_AI_FALLBACK_MODEL, DEFAULT_AI_MODEL, aiClientInfo, aiConfig } from "@/server/ai";
import { RISK_LIST, containsRiskPhrase, normalizeForRisk, riskListReady, type RiskList } from "./risk-check";

/** A stand-in list for testing the matcher; the real list is clinical content. */
const SAMPLE: RiskList = {
  status: "verified",
  reviewedBy: "test",
  reviewedAt: "2026-10-18",
  phrases: { id: ["frasa contoh satu"], en: ["sample phrase"] },
  neutralExamples: { id: [], en: [] },
};

describe("risk check before AI (A2, PRD 20.3)", () => {
  it("normalises case, width, punctuation, and spacing", () => {
    expect(normalizeForRisk("  Frasa,   CONTOH—satu! ")).toBe("frasa contoh satu");
    expect(normalizeForRisk("ｓａｍｐｌｅ\nphrase")).toBe("sample phrase");
  });

  it("matches listed phrases as whole words in either language", () => {
    expect(containsRiskPhrase("aku menulis frasa contoh satu di sini", SAMPLE)).toBe(true);
    expect(containsRiskPhrase("This is a SAMPLE, phrase.", SAMPLE)).toBe(true);
    expect(containsRiskPhrase("a samplephrase joined", SAMPLE)).toBe(false);
    expect(containsRiskPhrase("nothing to see", SAMPLE)).toBe(false);
  });

  it("A2: AI stays off until a psychologist has reviewed and filled the list", () => {
    expect(riskListReady(SAMPLE)).toBe(true);
    expect(riskListReady({ ...SAMPLE, status: "TODO(verify): pending" })).toBe(false);
    expect(riskListReady({ ...SAMPLE, reviewedBy: null })).toBe(false);
    expect(riskListReady({ ...SAMPLE, phrases: { id: ["x"], en: [] } })).toBe(false);

    const keys = { OPENROUTER_API_KEY: "key", OPENROUTER_MODEL: "model" } as unknown as NodeJS.ProcessEnv;
    expect(aiConfig(keys, false)).toBeNull();
    expect(aiConfig({} as NodeJS.ProcessEnv, true)).toBeNull();
    expect(aiConfig(keys, true)).toEqual({ apiKey: "key", model: "model", fallbackModel: DEFAULT_AI_FALLBACK_MODEL });
    // Without OPENROUTER_MODEL the owner's chosen free model is used.
    const keyOnly = { OPENROUTER_API_KEY: "key" } as unknown as NodeJS.ProcessEnv;
    expect(aiConfig(keyOnly, true)).toEqual({ apiKey: "key", model: DEFAULT_AI_MODEL, fallbackModel: DEFAULT_AI_FALLBACK_MODEL });
    // The list in the repo decides; while it is unreviewed, AI is off.
    expect(aiConfig(keys) !== null).toBe(riskListReady(RISK_LIST));
  });

  it("keeps Xing4 as the primary, with Nemotron 3 Ultra as the default fallback the owner can change or switch off", () => {
    const env = (values: Record<string, string>) => ({ OPENROUTER_API_KEY: "key", ...values }) as unknown as NodeJS.ProcessEnv;
    expect(DEFAULT_AI_MODEL).toBe("xingchen-agi/xing4.0-29b-a4b:free");
    expect(DEFAULT_AI_FALLBACK_MODEL).toBe("nvidia/nemotron-3-ultra-550b-a55b");
    expect(aiConfig(env({}), true)?.fallbackModel).toBe(DEFAULT_AI_FALLBACK_MODEL);
    expect(aiConfig(env({ OPENROUTER_FALLBACK_MODEL: " other/model " }), true)?.fallbackModel).toBe("other/model");
    expect(aiConfig(env({ OPENROUTER_FALLBACK_MODEL: "off" }), true)?.fallbackModel).toBeNull();
    expect(aiConfig(env({ OPENROUTER_FALLBACK_MODEL: "OFF" }), true)?.fallbackModel).toBeNull();
    // A fallback equal to the primary would only repeat the same request.
    expect(aiConfig(env({ OPENROUTER_MODEL: "same/model", OPENROUTER_FALLBACK_MODEL: "same/model" }), true)?.fallbackModel).toBeNull();
    // The page learns both model names for the consent screen, never the key.
    const info = aiClientInfo(env({ OPENROUTER_API_KEY: "sk-secret-value" }));
    expect(JSON.stringify(info)).not.toContain("sk-secret-value");
    expect(Object.keys(info).sort()).toEqual(["available", "fallbackModel", "model"]);
  });

  it("while the list is not approved, it says so and AI stays off", () => {
    if (riskListReady(RISK_LIST)) return;
    expect(RISK_LIST.status).toMatch(/^TODO\(verify\)/);
  });

  it("the real list catches its sources' own wording, in first person", () => {
    for (const sentence of [
      // PHQ-9 item 9, official Indonesian form.
      "Akhir-akhir ini aku merasa lebih baik mati",
      "Aku ingin melukai diri sendiri",
      // C-SSRS screener questions 1, 2, 5 and 6.
      "I wish I were dead",
      "Sometimes I wish I could go to sleep and not wake up",
      "I have had thoughts of killing myself",
      "I worked out how to kill myself",
      "I have thought about how to end my life",
      // Kemenkes warning signs 1, 2, 7 and 18.
      "Aku pengen mati aja rasanya",
      "Aku sering kepikiran bunuh diri",
      "Aku merasa tidak punya alasan untuk hidup",
      "Aku cuma jadi beban bagi keluargaku",
      "Aku sudah menulis surat wasiat",
    ]) {
      expect(containsRiskPhrase(sentence), sentence).toBe(true);
    }
  });

  it("the real list matches each phrase and none of its neutral examples", () => {
    for (const phrase of [...RISK_LIST.phrases.id, ...RISK_LIST.phrases.en]) {
      expect(containsRiskPhrase(phrase), phrase).toBe(true);
    }
    for (const sentence of [...RISK_LIST.neutralExamples.id, ...RISK_LIST.neutralExamples.en]) {
      expect(containsRiskPhrase(sentence), sentence).toBe(false);
    }
  });
});

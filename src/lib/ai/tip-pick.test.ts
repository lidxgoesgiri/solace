import { describe, expect, it } from "vitest";
import { TIPS } from "@/lib/tips";
import { REFLECTION_MAX_CHARS, expectedReply, parseReflection, parseTipPick, parseTipPickRequest, tipPickPrompt } from "./tip-pick";
import { AI_CONSENT_VERSIONS, aiConsent, validAiConsent } from "./consent";

describe("canonical-library selection only", () => {
  it("accepts exactly one eligible ID, not generated content", () => {
    expect(parseTipPick({ tipId: "grounding" }, ["grounding"])).toEqual({ tipId: "grounding" });
    for (const value of [null, [], "grounding", {}, { tipId: "invented" }, { tipId: "grounding", title: "new" }, { tipId: "grounding", reason: "new" }, { tipId: "grounding", steps: ["new"] }]) {
      expect(parseTipPick(value, ["grounding"])).toBeNull();
    }
  });

  it("binds opt-in to the current feature, model and consent version", () => {
    const consent = aiConsent("tips", "chosen/model");
    expect(validAiConsent(consent, "tips", "chosen/model")).toBe(true);
    for (const value of [null, true, { ...consent, version: 1 }, { ...consent, version: 2 }, { ...consent, feature: "notes" }, { ...consent, model: "other/model" }]) {
      expect(validAiConsent(value, "tips", "chosen/model")).toBe(false);
    }
  });

  it("asks for tips consent again for the reflection copy, but not for notes", () => {
    expect(AI_CONSENT_VERSIONS).toEqual({ notes: 2, tips: 3 });
    expect(validAiConsent({ version: 2, feature: "notes", model: "m" }, "notes", "m")).toBe(true);
    expect(validAiConsent({ version: 2, feature: "tips", model: "m" }, "tips", "m")).toBe(false);
  });
});

describe("one reflection, not a conversation", () => {
  const base = { replacedId: "slow-breathing", candidates: ["grounding", "worry-time"], context: " lagi capek ", locale: "id" };

  it("expects a reflection only when there is a sentence to reflect, and a tip only when one was asked for", () => {
    expect(expectedReply({ context: "", mode: "tip" })).toEqual({ tip: true, reflection: false });
    expect(expectedReply({ context: "capek", mode: "tip" })).toEqual({ tip: true, reflection: true });
    expect(expectedReply({ context: "capek", mode: "listen" })).toEqual({ tip: false, reflection: true });
  });

  it("reads the mode, defaulting to a tip, and refuses listening to nothing", () => {
    expect(parseTipPickRequest(base, TIPS)).toEqual({ ...base, context: "lagi capek", mode: "tip" });
    expect(parseTipPickRequest({ ...base, mode: "listen" }, TIPS)?.mode).toBe("listen");
    for (const bad of [{ ...base, mode: "chat" }, { ...base, mode: 1 }, { ...base, mode: "listen", context: "  " }]) {
      expect(parseTipPickRequest(bad, TIPS)).toBeNull();
    }
  });

  it("keeps warm, specific reflections and trims spacing", () => {
    for (const text of [
      "Kedengarannya kamu sangat lelah karena skripsi terus menyita jam tidurmu.",
      "It sounds like the deadlines have left you worn out, and that makes sense.",
      "Rasanya pasti berat menghadapi semua ini sendirian!",
    ]) {
      expect(parseReflection(`  ${text}  `)).toBe(text);
    }
    expect(parseReflection("x".repeat(REFLECTION_MAX_CHARS))).not.toBeNull();
  });

  it("refuses questions, links, contact details, long numbers, diagnoses, medicine, emoji and empty or long text", () => {
    for (const text of [
      "", "   ", null, 42, ["Kamu lelah."],
      "x".repeat(REFLECTION_MAX_CHARS + 1),
      "Kamu lelah. Mau cerita lebih banyak?",
      "Kamu lelah. Baca https://contoh.id",
      "Kamu lelah. Lihat www.contoh.org",
      "Kirim email ke tolong@contoh.id",
      "Hubungi 119 sekarang.",
      "Kamu lelah.\nIstirahatlah.",
      "Kamu sangat lelah!!",
      "Kamu lelah 🙏",
      "Sepertinya kamu mengidap depresi.",
      "Ini tanda gangguan kecemasan.",
      "It sounds like an anxiety disorder.",
      "You may have been diagnosed before.",
      "Minum obat tidur bisa membantu.",
      "Ask about antidepressants.",
    ]) {
      expect(parseReflection(text), String(text)).toBeNull();
    }
  });

  it("accepts exactly the expected fields", () => {
    const reflection = "Kedengarannya kamu sangat lelah.";
    const both = { tip: true, reflection: true };
    const heard = { tip: false, reflection: true };
    expect(parseTipPick({ tipId: "grounding", reflection }, ["grounding"], both)).toEqual({ tipId: "grounding", reflection });
    expect(parseTipPick({ reflection }, ["grounding"], heard)).toEqual({ reflection });
    for (const [value, expected] of [
      [{ tipId: "grounding" }, both],
      [{ reflection }, both],
      [{ tipId: "invented", reflection }, both],
      [{ tipId: "grounding", reflection: "Mau coba napas?" }, both],
      [{ tipId: "grounding", reflection, steps: ["new"] }, both],
      [{ tipId: "grounding", reflection }, heard],
      [{ reflection, advice: "tidur" }, heard],
      [{}, { tip: false, reflection: false }],
    ] as const) {
      expect(parseTipPick(value, ["grounding"], expected), JSON.stringify(value)).toBeNull();
    }
  });

  it("sends no library text when the user only wants to be heard", () => {
    const listen = parseTipPickRequest({ ...base, mode: "listen" }, TIPS)!;
    expect(tipPickPrompt(listen, TIPS)).toEqual({ language: "Indonesian", context: "lagi capek" });
    const tip = parseTipPickRequest(base, TIPS)!;
    expect(tipPickPrompt(tip, TIPS)).toMatchObject({ language: "Indonesian", context: "lagi capek", notHelpful: { id: "slow-breathing" } });
  });
});

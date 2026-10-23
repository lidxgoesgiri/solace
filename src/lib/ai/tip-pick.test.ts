import { describe, expect, it } from "vitest";
import { parseTipPick } from "./tip-pick";
import { aiConsent, validAiConsent } from "./consent";

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
    for (const value of [null, true, { ...consent, version: 1 }, { ...consent, feature: "notes" }, { ...consent, model: "other/model" }]) {
      expect(validAiConsent(value, "tips", "chosen/model")).toBe(false);
    }
  });
});

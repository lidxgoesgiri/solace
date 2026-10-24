import { afterEach, describe, expect, it } from "vitest";
import {
  clearDrafts,
  restoreSafetyDraft,
  restoreStartDraft,
  saveSafetyDraft,
  saveStartDraft,
} from "./draft-store";

afterEach(clearDrafts);

describe("form drafts across a language switch", () => {
  it("restores a start draft only in the other language", () => {
    saveStartDraft({ age: "adult", consent: true }, "id");
    expect(restoreStartDraft("id")).toBeNull();
    expect(restoreStartDraft("en")).toEqual({ age: "adult", consent: true });
  });

  it("follows the language the draft was last shown in", () => {
    saveSafetyDraft(2, "id");
    expect(restoreSafetyDraft("en")).toBe(2);
    saveSafetyDraft(2, "en");
    expect(restoreSafetyDraft("en")).toBeNull();
    expect(restoreSafetyDraft("id")).toBe(2);
  });

  it("keeps the answer 0 as a real choice", () => {
    saveSafetyDraft(0, "en");
    expect(restoreSafetyDraft("id")).toBe(0);
  });

  it("drops the safety draft when nothing is selected or drafts are cleared", () => {
    saveSafetyDraft(1, "id");
    saveSafetyDraft(null, "id");
    expect(restoreSafetyDraft("en")).toBeNull();

    saveSafetyDraft(3, "id");
    saveStartDraft({ age: "minor", consent: false }, "id");
    clearDrafts();
    expect(restoreSafetyDraft("en")).toBeNull();
    expect(restoreStartDraft("en")).toBeNull();
  });
});

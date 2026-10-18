import { describe, expect, it } from "vitest";
import { NOTE_MAX_CHARS, NOTE_QUESTIONS, aiOffer, cleanNote, hasNotes, parseNoteAnswers } from "./notes";

describe("notes for the psychologist (AI-04)", () => {
  it("has five guided questions", () => {
    expect(NOTE_QUESTIONS).toEqual(["since", "hardest", "tried", "ask", "hope"]);
  });

  it("keeps line breaks, drops control characters, and caps the length", () => {
    expect(cleanNote("  sejak\r\nSeptember\u0007  ")).toBe("sejak\nSeptember");
    expect(cleanNote("a\n\n\n\nb")).toBe("a\n\nb");
    expect(cleanNote("x".repeat(NOTE_MAX_CHARS + 50))).toHaveLength(NOTE_MAX_CHARS);
  });

  it("accepts exactly five strings", () => {
    expect(parseNoteAnswers(["a", "", "c", "", "e"])).toEqual(["a", "", "c", "", "e"]);
    expect(parseNoteAnswers(["a", "b"])).toBeNull();
    expect(parseNoteAnswers(["a", "b", "c", "d", 5])).toBeNull();
    expect(parseNoteAnswers("abcde")).toBeNull();
    expect(parseNoteAnswers(["x".repeat(NOTE_MAX_CHARS * 3), "", "", "", ""])).toBeNull();
  });

  it("knows when nothing was written", () => {
    expect(hasNotes(["", " ", "", "", ""])).toBe(false);
    expect(hasNotes(["", "", "ya", "", ""])).toBe(true);
  });
});

describe("when the AI step is offered (A1, A3)", () => {
  const base = { available: true, signedIn: true, consented: true, crisisPending: false };

  it("A1: off unless switched on, and consent comes first", () => {
    expect(aiOffer({ ...base, available: false })).toBe("hidden");
    expect(aiOffer({ ...base, consented: false })).toBe("consent");
    expect(aiOffer(base)).toBe("ready");
  });

  it("A3: never while a crisis is pending, even with consent", () => {
    expect(aiOffer({ ...base, crisisPending: true })).toBe("hidden");
    expect(aiOffer({ ...base, crisisPending: true, signedIn: false })).toBe("hidden");
  });

  it("asks to sign in first", () => {
    expect(aiOffer({ ...base, signedIn: false, consented: false })).toBe("sign_in");
  });
});

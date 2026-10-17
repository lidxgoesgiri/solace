import { describe, expect, it } from "vitest";
import { createInitialFlowState, flowReducer, mustShowCrisis, type FlowEvent } from "@/lib/flow";
import { resultsView } from "@/lib/results";
import { scoreDass21, type AnswerValue } from "@/lib/scoring";
import { isAcceptablePassphrase, passphraseStrength } from "./passphrase";
import { flowFromScreeningRecord, scoreRecord, screeningRecordFromFlow, sortByCompletion } from "./screening";
import type { ScreeningRecord } from "./types";
import { normalizeUsername } from "./username";

function finished(value: AnswerValue, safety: AnswerValue, acknowledge = false) {
  const events: FlowEvent[] = [
    { type: "BEGIN_SCREENING" },
    ...Array.from({ length: 21 }, (_, i) => ({ type: "ANSWER_ITEM" as const, item: i + 1, value })),
    { type: "ANSWER_SAFETY", value: safety, at: "2026-10-12T10:00:00.000Z", locale: "id" },
  ];
  if (acknowledge) events.push({ type: "ACKNOWLEDGE_CRISIS" });
  return events.reduce(flowReducer, createInitialFlowState());
}

describe("passphrase strength (AK-01)", () => {
  it.each([
    ["short", "too_short"],
    ["sebelas karakter".slice(0, 11), "too_short"],
    ["aaaaaaaaaaaaaaaa", "weak"],
    ["password12345678", "weak"],
    ["kucingoranye", "weak"],
    ["kucing oranye tidur", "fair"],
    ["teh hangat sebelum ujian akhir", "strong"],
    ["Kopi-Tubruk 2026 di Halte!", "strong"],
  ] as const)("%s → %s", (passphrase, strength) => {
    expect(passphraseStrength(passphrase)).toBe(strength);
  });

  it("accepts only fair or strong passphrases of 12+ characters", () => {
    expect(isAcceptablePassphrase("teh hangat sebelum ujian akhir")).toBe(true);
    expect(isAcceptablePassphrase("kucing oranye tidur")).toBe(true);
    expect(isAcceptablePassphrase("kucingoranye")).toBe(false);
    expect(isAcceptablePassphrase("short")).toBe(false);
  });
});

describe("usernames (AK-01: no email, no real-name requirement)", () => {
  it("normalises case and width, and rejects emails and odd characters", () => {
    expect(normalizeUsername("  Rani.Uji ")).toBe("rani.uji");
    expect(normalizeUsername("ｒａｎｉ_19")).toBe("rani_19");
    expect(normalizeUsername("rani@kampus.ac.id")).toBeNull();
    expect(normalizeUsername("ra")).toBeNull();
    expect(normalizeUsername("-rani")).toBeNull();
    expect(normalizeUsername("rani budi")).toBeNull();
    expect(normalizeUsername("x".repeat(33))).toBeNull();
    expect(normalizeUsername(42)).toBeNull();
  });
});

describe("screening records (AK-04, PDF-04)", () => {
  it("only a finished screening becomes a record", () => {
    expect(screeningRecordFromFlow(createInitialFlowState())).toBeNull();
    const record = screeningRecordFromFlow(finished(1, 0));
    expect(record).toEqual({
      v: 1,
      answers: Array(21).fill(1),
      safetyAnswer: 0,
      crisisShown: false,
      completedAt: "2026-10-12T10:00:00.000Z",
      completedLocale: "id",
    });
  });

  it("round-trips to the same results the results page shows (K8)", () => {
    const state = finished(2, 0);
    const record = screeningRecordFromFlow(state)!;
    const restored = flowFromScreeningRecord(record);
    expect(resultsView(restored)?.result).toEqual(resultsView(state)?.result);
    expect(scoreRecord(record)).toEqual(scoreDass21(state.answers));
  });

  it("remembers a confirmed crisis screen for the report", () => {
    const record = screeningRecordFromFlow(finished(1, 2, true))!;
    expect(record.crisisShown).toBe(true);
    const restored = flowFromScreeningRecord(record);
    expect(mustShowCrisis(restored)).toBe(false);
    expect(resultsView(restored)).not.toBeNull();
  });

  it("K3: a positive safety answer without a confirmed crisis keeps results closed", () => {
    const tampered: ScreeningRecord = { ...screeningRecordFromFlow(finished(1, 0))!, safetyAnswer: 3 };
    const restored = flowFromScreeningRecord(tampered);
    expect(mustShowCrisis(restored)).toBe(true);
    expect(resultsView(restored)).toBeNull();
  });

  it("sorts saved screenings oldest first", () => {
    const base = screeningRecordFromFlow(finished(1, 0))!;
    const later = { value: { ...base, completedAt: "2026-10-20T10:00:00.000Z" } };
    const earlier = { value: { ...base, completedAt: "2026-09-01T10:00:00.000Z" } };
    expect(sortByCompletion([later, earlier]).map((r) => r.value.completedAt)).toEqual([
      "2026-09-01T10:00:00.000Z",
      "2026-10-20T10:00:00.000Z",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { createInitialFlowState, flowReducer, resultsView, type FlowEvent, type FlowState } from "@/lib/flow";
import type { AnswerValue } from "@/lib/scoring";
import {
  buildReportModel,
  cleanNickname,
  cutoffRanges,
  generateReportCode,
  reportFileName,
  type ReportOptions,
} from "./model";

const AT = "2026-10-17T05:30:00.000Z"; // midday in both UTC and WIB

function finished(itemValue: AnswerValue, safety: AnswerValue = 0, locale: "id" | "en" = "en"): FlowState {
  const events: FlowEvent[] = [
    { type: "BEGIN_SCREENING" },
    ...Array.from({ length: 21 }, (_, i) => ({ type: "ANSWER_ITEM" as const, item: i + 1, value: itemValue })),
    { type: "ANSWER_SAFETY", value: safety, at: AT, locale },
  ];
  let state = events.reduce(flowReducer, createInitialFlowState());
  if (safety > 0) state = flowReducer(state, { type: "ACKNOWLEDGE_CRISIS" });
  return state;
}

const OPTIONS: ReportOptions = {
  locale: "en",
  country: "ID",
  nickname: "",
  includeSafety: true,
  code: "SOL-TEST-0001",
};

function model(state: FlowState, options: Partial<ReportOptions> = {}) {
  const view = resultsView(state);
  if (!view) throw new Error("results not available");
  return { view, report: buildReportModel(state, view.result, { ...OPTIONS, ...options }) };
}

describe("PDF-02 / K8: the report uses the same numbers as the results page", () => {
  it.each([0, 1, 2, 3] as const)("all answers %i", (value) => {
    const { view, report } = model(finished(value));
    for (const row of report.scores) {
      expect(row).toEqual({ subscale: row.subscale, ...view.result[row.subscale] });
    }
    expect(report.scores.map((s) => s.subscale)).toEqual(["depression", "anxiety", "stress"]);
  });

  it("all answers 1: 14 moderate, 14 moderate, 14 normal with raw 7", () => {
    const { report } = model(finished(1));
    expect(report.scores).toEqual([
      { subscale: "depression", raw: 7, score: 14, severity: "moderate" },
      { subscale: "anxiety", raw: 7, score: 14, severity: "moderate" },
      { subscale: "stress", raw: 7, score: 14, severity: "normal" },
    ]);
  });
});

describe("report content (PRD 12)", () => {
  it("lists all 21 items in order with their subscale and answer", () => {
    const { report } = model(finished(2));
    expect(report.items.map((i) => i.number)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    expect(report.items[0]).toMatchObject({ number: 1, subscale: "stress", answer: 2 });
    expect(report.items[2]).toMatchObject({ number: 3, subscale: "depression" });
    expect(report.items[1]).toMatchObject({ number: 2, subscale: "anxiety" });
    expect(report.items[0]?.text).toBe("I found it hard to wind down");
  });

  it("falls back to the official English item text while the Indonesian text is a placeholder", () => {
    const { report } = model(finished(1), { locale: "id" });
    expect(report.usesEnglishItemText).toBe(true);
    expect(report.items[0]?.text).toBe("I found it hard to wind down");
    expect(report.answerScale[0]?.label).toBe("Did not apply to me at all");
    for (const item of report.items) expect(item.text).not.toMatch(/TODO/);
  });

  it("records when and in which language the screening was finished", () => {
    const { report } = model(finished(1, 0, "id"));
    expect(report.completedAt).toBe(AT);
    expect(report.instrumentLocale).toBe("id");
    expect(report.languageSource).toMatchObject({ kind: "translation" });
    expect(model(finished(1, 0, "en")).report.languageSource).toMatchObject({ kind: "official" });
  });

  it("includes the safety note by default, with the crisis screen status", () => {
    const { report } = model(finished(0, 2));
    expect(report.safety).toEqual({ answer: 2, optionLabel: "More than half the days", crisisShown: true });
  });

  it("leaves the safety note out when the user chooses to", () => {
    expect(model(finished(0, 2), { includeSafety: false }).report.safety).toBeNull();
  });

  it("safety answer 0 is reported without claiming anything is safe", () => {
    const { report } = model(finished(0, 0));
    expect(report.safety).toEqual({ answer: 0, optionLabel: "Not at all", crisisShown: false });
  });

  it("lists the help directory for the chosen country, not the language (K6)", () => {
    const id = model(finished(1), { locale: "en", country: "ID" }).report;
    expect(id.services.map((s) => s.id)).toEqual(["id-emergency", "id-healing119"]);
    const gb = model(finished(1), { locale: "id", country: "GB" }).report;
    expect(gb.services.map((s) => s.id)).toEqual(["gb-999", "gb-samaritans"]);
  });

  it("refuses to build a report for an unfinished screening", () => {
    const partial = [{ type: "BEGIN_SCREENING" } as FlowEvent].reduce(flowReducer, createInitialFlowState());
    const result = resultsView(finished(1))!.result;
    expect(() => buildReportModel(partial, result, OPTIONS)).toThrow();
  });
});

describe("cutoff table comes from the single CUTOFFS constant", () => {
  it("matches the official DASS-21 table (PRD 10.2)", () => {
    expect(cutoffRanges()).toEqual([
      { severity: "normal", ranges: { depression: "0–9", anxiety: "0–7", stress: "0–14" } },
      { severity: "mild", ranges: { depression: "10–13", anxiety: "8–9", stress: "15–18" } },
      { severity: "moderate", ranges: { depression: "14–20", anxiety: "10–14", stress: "19–25" } },
      { severity: "severe", ranges: { depression: "21–27", anxiety: "15–19", stress: "26–33" } },
      { severity: "extremely_severe", ranges: { depression: "28+", anxiety: "20+", stress: "34+" } },
    ]);
  });
});

describe("privacy details (PRD 12)", () => {
  it("names the file by screening date with no user name", () => {
    expect(reportFileName(AT, new Date())).toBe("solace-dass21-2026-10-17.pdf");
    expect(reportFileName(null, new Date(2026, 9, 18, 12))).toBe("solace-dass21-2026-10-18.pdf");
  });

  it("keeps the nickname optional, trimmed, and short", () => {
    expect(cleanNickname("")).toBeNull();
    expect(cleanNickname("   ")).toBeNull();
    expect(cleanNickname("  Rani \n")).toBe("Rani");
    expect(cleanNickname("x".repeat(80))).toHaveLength(40);
  });

  it("makes random report codes in a fixed, readable format", () => {
    const code = generateReportCode();
    expect(code).toMatch(/^SOL-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(generateReportCode()).not.toBe(code);
    const fixed = generateReportCode((bytes) => bytes.fill(0));
    expect(fixed).toBe("SOL-0000-0000");
  });
});

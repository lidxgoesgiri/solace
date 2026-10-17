import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialFlowState, flowReducer, resultsView, type FlowEvent, type FlowState } from "@/lib/flow";
import type { AnswerValue } from "@/lib/scoring";
import { buildReportModel, type ReportOptions } from "./model";
import { renderReportPdf } from "./pdf";
import { TEST_LABELS } from "./test-fixtures";

const LABELS = TEST_LABELS;

const OPTIONS: ReportOptions = {
  locale: "en",
  country: "ID",
  nickname: "",
  includeSafety: true,
  code: "SOL-TEST-0001",
};

function finished(itemValue: AnswerValue, safety: AnswerValue = 0): FlowState {
  const events: FlowEvent[] = [
    { type: "BEGIN_SCREENING" },
    ...Array.from({ length: 21 }, (_, i) => ({ type: "ANSWER_ITEM" as const, item: i + 1, value: itemValue })),
    { type: "ANSWER_SAFETY", value: safety, at: "2026-10-17T05:30:00.000Z", locale: "en" },
  ];
  let state = events.reduce(flowReducer, createInitialFlowState());
  if (safety > 0) state = flowReducer(state, { type: "ACKNOWLEDGE_CRISIS" });
  return state;
}

async function render(state: FlowState, options: Partial<ReportOptions> = {}) {
  const view = resultsView(state);
  if (!view) throw new Error("results not available");
  const model = buildReportModel(state, view.result, { ...OPTIONS, ...options });
  const rendered = await renderReportPdf(model, LABELS, new Date("2026-10-17T06:00:00.000Z"));
  return { view, model, rendered };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("renderReportPdf", () => {
  it("produces a valid PDF with a summary page and a details page", async () => {
    const { rendered } = await render(finished(1));
    const header = new TextDecoder().decode(rendered.bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
    const doc = await PDFDocument.load(rendered.bytes);
    expect(doc.getPageCount()).toBe(rendered.pages.length);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it("keeps personal information out of the metadata (PRD 12)", async () => {
    const { rendered } = await render(finished(1), { nickname: "Rani" });
    const doc = await PDFDocument.load(rendered.bytes, { updateMetadata: false });
    expect(doc.getTitle()).toBe(LABELS.docTitle);
    expect(doc.getAuthor() ?? "").toBe("");
    expect(doc.getCreator()).toBe("Solace");
    expect(doc.getProducer()).toBe("Solace");
    expect(doc.getKeywords() ?? "").toBe("");
  }, 30_000);

  it.each([0, 1, 2, 3] as const)(
    "K8: every score row matches the results object (all answers %i)",
    async (value) => {
      const { view, rendered } = await render(finished(value));
      const page1 = rendered.pages[0] ?? [];
      for (const subscale of ["depression", "anxiety", "stress"] as const) {
        const { raw, score, severity } = view.result[subscale];
        const at = page1.indexOf(LABELS.subscale[subscale]);
        expect(at, subscale).toBeGreaterThan(-1);
        expect(page1.slice(at, at + 4)).toEqual([
          LABELS.subscale[subscale],
          String(raw),
          String(score),
          LABELS.severity[severity],
        ]);
      }
    },
    30_000,
  );

  it("K7: the disclaimer is on the summary page", async () => {
    const { rendered } = await render(finished(2));
    const page1 = (rendered.pages[0] ?? []).join(" ");
    expect(page1).toContain(LABELS.disclaimer);
  }, 30_000);

  it("includes the safety note by default and leaves it out on request", async () => {
    const withNote = (await render(finished(0, 2))).rendered.pages[0] ?? [];
    expect(withNote).toContain(LABELS.safetyTitle);
    expect(withNote).toContain("2 – More than half the days");
    expect(withNote).toContain(LABELS.yes);

    const without = (await render(finished(0, 2), { includeSafety: false })).rendered.pages[0] ?? [];
    expect(without).not.toContain(LABELS.safetyTitle);
  }, 30_000);

  it("prints the nickname only when the user typed one", async () => {
    const named = (await render(finished(1), { nickname: "Rani" })).rendered.pages[0] ?? [];
    expect(named).toContain("Rani");
    const anonymous = (await render(finished(1))).rendered.pages[0] ?? [];
    expect(anonymous).not.toContain(LABELS.nickname);
  }, 30_000);

  it("lists all 21 items, the cutoff table, and the help directory on later pages", async () => {
    const { rendered } = await render(finished(3));
    const rest = rendered.pages.slice(1).flat();
    expect(rest).toContain("I found it hard to wind down");
    expect(rest).toContain("I felt that life was meaningless");
    expect(rest).toContain("28+");
    expect(rest.some((text) => text.startsWith("Healing119"))).toBe(true);
    expect(rest.some((text) => text.includes("healing119.id"))).toBe(true);
    expect(rest.some((text) => text.includes("Call 112"))).toBe(true);
  }, 30_000);

  it("PDF-01: makes no network request while building the PDF", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("network is not allowed while creating the PDF");
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { rendered } = await render(finished(1));
    expect(rendered.bytes.length).toBeGreaterThan(1000);
    expect(fetchSpy).not.toHaveBeenCalled();
  }, 30_000);
});

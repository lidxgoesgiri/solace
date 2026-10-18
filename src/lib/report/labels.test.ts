import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import id from "../../../messages/id.json";
import { createInitialFlowState, flowReducer, type FlowEvent } from "@/lib/flow";
import { resultsView } from "@/lib/results";
import { buildReportLabels, type Translate } from "./labels";
import { buildReportModel } from "./model";
import { renderReportPdf } from "./pdf";

type Messages = { [key: string]: string | Messages };

/** Minimal translator for tests: dotted keys and simple {placeholders}. */
function translator(messages: Messages): Translate {
  return (key, values = {}) => {
    const value = key.split(".").reduce<string | Messages | undefined>(
      (node, part) => (node && typeof node === "object" ? node[part] : undefined),
      messages,
    );
    if (typeof value !== "string") throw new Error(`Missing message: ${key}`);
    return value.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
  };
}

const finished = (() => {
  const events: FlowEvent[] = [
    { type: "BEGIN_SCREENING" },
    ...Array.from({ length: 21 }, (_, i) => ({ type: "ANSWER_ITEM" as const, item: i + 1, value: 2 as const })),
    { type: "ANSWER_SAFETY", value: 1, at: "2026-10-17T05:30:00.000Z", locale: "id" },
    { type: "ACKNOWLEDGE_CRISIS" },
  ];
  return events.reduce(flowReducer, createInitialFlowState());
})();

describe.each([
  ["id", id],
  ["en", en],
] as const)("report with the real %s messages", (locale, messages) => {
  const t = translator(messages as Messages);
  const labels = buildReportLabels({
    t,
    country: "ID",
    formatDateTime: (iso) => new Date(iso).toISOString().slice(0, 16).replace("T", " "),
    formatDate: (iso) => iso.slice(0, 10),
    now: new Date("2026-10-17T06:00:00.000Z"),
  });

  it("every label exists and none is left as a raw key", () => {
    for (const [key, value] of Object.entries(labels)) {
      if (typeof value === "string") expect(value, key).not.toMatch(/^report\.|\{\w+\}/);
    }
  });

  it("renders two pages whose text the embedded fonts can fully draw", async () => {
    const view = resultsView(finished)!;
    const model = buildReportModel(finished, view.result, {
      locale,
      country: "ID",
      nickname: "Budi",
      includeSafety: true,
      code: "SOL-TEST-0002",
    });
    const rendered = await renderReportPdf(model, labels, new Date("2026-10-17T06:00:00.000Z"));
    const doc = await PDFDocument.load(rendered.bytes);
    expect(doc.getPageCount()).toBe(2);
    const text = rendered.pages.flat();
    // Characters the fonts lack would have been replaced with "?".
    expect(text.filter((run) => run.includes("?"))).toEqual([]);
    expect(rendered.pages[0]?.join(" ")).toContain(labels.disclaimer);
    expect(rendered.pages[0]).toContain(labels.severity.extremely_severe);
  }, 30_000);

  it("notes for the psychologist add page 3, in the user's own words (AI-04, AI-06)", async () => {
    const view = resultsView(finished)!;
    const answers = ["Sejak awal semester ini.", "", "Jalan pagi.\nMengurangi kopi.", "", "Bisa tidur lebih nyenyak."];
    for (const aiAssisted of [false, true]) {
      const model = buildReportModel(finished, view.result, {
        locale,
        country: "ID",
        nickname: "",
        includeSafety: true,
        code: "SOL-TEST-0003",
        notes: { answers, aiAssisted },
      });
      const rendered = await renderReportPdf(model, labels, new Date("2026-10-17T06:00:00.000Z"));
      expect(rendered.pages).toHaveLength(3);
      const page3 = rendered.pages[2]!.join(" ");
      expect(page3).toContain(labels.notesTitle);
      expect(page3).toContain(aiAssisted ? labels.notesByAi : labels.notesByUser);
      expect(page3).toContain(labels.notesQuestion.since);
      expect(page3).toContain("Mengurangi kopi.");
      // Unanswered questions are left out.
      expect(page3).not.toContain(labels.notesQuestion.hardest);
      expect(rendered.pages.flat().filter((run) => run.includes("?") && !run.endsWith("?"))).toEqual([]);
    }
  }, 30_000);
});

import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { servicesFor } from "@/lib/content";
import { renderSafetyPlanPdf, type SafetyPlanLabels } from "./pdf";
import { TEST_LABELS } from "./test-fixtures";

const LABELS: SafetyPlanLabels = {
  ...TEST_LABELS,
  docTitle: "Safety Plan",
  intro: "A personal plan to help get through hard moments.",
  madeOn: "Made on 17 October 2026",
  empty: "(not filled in yet)",
  disclaimer: "Solace is a screening tool, not an emergency service.",
  footer: "Solace · Safety plan",
  page: (page, total) => `Page ${page} of ${total}`,
};

const SECTIONS = [
  {
    title: "Signs that a hard moment might be coming",
    text: "Not sleeping for days\nAvoiding friends",
  },
  { title: "Ways to calm yourself", text: "Slow breathing" },
  { title: "People and places that can take your mind off things", text: "" },
  { title: "People you can ask for help", text: "A friend (example)" },
  { title: "Professional services you can contact", text: "" },
  { title: "Ways to make your surroundings safer", text: "Ask someone to stay with me" },
];

async function render() {
  return renderSafetyPlanPdf(
    {
      locale: "en",
      sections: SECTIONS,
      services: [...servicesFor("ID", "emergency"), ...servicesFor("ID", "support")],
    },
    LABELS,
    new Date("2026-10-17T06:00:00.000Z"),
  );
}

describe("safety plan PDF (SP-03)", () => {
  it("contains every section, the user's lines, and placeholders for empty ones", async () => {
    const { pages } = await render();
    const text = pages.flat().join("\n");
    SECTIONS.forEach((section, index) => expect(text).toContain(`${index + 1}. ${section.title}`));
    expect(text).toContain("Not sleeping for days");
    expect(text).toContain("Avoiding friends");
    expect(text).toContain("Ask someone to stay with me");
    expect(text.split("(not filled in yet)")).toHaveLength(3);
  });

  it("ends with the help directory for the chosen country and a disclaimer", async () => {
    const { pages } = await render();
    const text = pages.flat().join("\n");
    expect(text).toContain("Healing119");
    expect(text).toContain("Solace is a screening tool, not an emergency service.");
    expect(pages.at(-1)!.at(-1)).toMatch(/^Page \d of \d$/);
  });

  it("keeps personal information out of the metadata", async () => {
    const { bytes } = await render();
    const doc = await PDFDocument.load(bytes);
    expect(doc.getAuthor()).toBe("");
    expect(doc.getTitle()).toBe("Safety Plan");
    expect(doc.getCreator()).toBe("Solace");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import id from "../../messages/id.json";
import { DRAFT_TTL_MS } from "./flow";
import { METRIC_EVENTS } from "./metrics";
import { PRIVACY_SECTIONS } from "./privacy";
import { SESSION_COOKIE, SESSION_IDLE_MS } from "@/server/session";

const pages = { id: id.privacy, en: en.privacy } as Record<"id" | "en", Record<string, string>>;

describe("privacy page (PRD 13)", () => {
  it.each(["id", "en"] as const)("%s: every section has a title and all its statements", (locale) => {
    const listed = new Set<string>(["title", "intro", "updated", "contactLink"]);
    for (const { title, items } of PRIVACY_SECTIONS) {
      for (const key of [title, ...items]) {
        expect(pages[locale][key], key).toBeTruthy();
        listed.add(key);
      }
    }
    // Every text in the namespace is shown on the page.
    expect(Object.keys(pages[locale]).filter((key) => !listed.has(key))).toEqual([]);
  });

  it("states the same numbers and names the code uses", () => {
    expect(SESSION_IDLE_MS).toBe(30 * 60_000);
    expect(pages.id.account5).toContain("30 menit");
    expect(pages.en.account5).toContain("30 minutes");
    for (const locale of ["id", "en"] as const) expect(pages[locale].account5).toContain(SESSION_COOKIE);

    expect(METRIC_EVENTS).toHaveLength(5);
    expect(pages.id.metrics1).toContain("lima peristiwa");
    expect(pages.en.metrics1).toContain("five events");

    expect(DRAFT_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(pages.id.device2).toContain("7 hari");
    expect(pages.en.device2).toContain("7 days");
  });

  it("the AI statement matches the request Solace sends", () => {
    const ai = readFileSync("src/server/api/ai.ts", "utf8");
    expect(ai).toContain('provider: { data_collection: "deny", zdr: true, require_parameters: true }');
    expect(pages.en.ai4).toContain("zero data retention");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { requestTipPick, requestTidyNotes } from "./client";

afterEach(() => vi.unstubAllGlobals());

const actions = [
  { name: "notes", run: () => requestTidyNotes(["An example note", "", "", "", ""]) },
  { name: "tips", run: () => requestTipPick({ replacedId: "slow-breathing", candidates: ["grounding"], context: "", locale: "en" }) },
];

describe.each(actions)("$name: provider and account limits", ({ run }) => {
  it.each([
    [503, "ai_busy", "busy"],
    [429, "rate_limited", "limited"],
    [503, "ai_disabled", "error"],
    [502, "ai_unavailable", "error"],
    [401, "unauthorized", "signed_out"],
    [422, "risk_detected", "risk"],
  ])("HTTP %i %s becomes %s, without automatic retries", async (status, error, kind) => {
    const fetch = vi.fn(async () => Response.json({ error }, { status }));
    vi.stubGlobal("fetch", fetch);
    expect(await run()).toEqual({ kind });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

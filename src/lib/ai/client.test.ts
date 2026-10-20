import { afterEach, describe, expect, it, vi } from "vitest";
import { hasAiConsent, requestTipPick, requestTidyNotes, saveAiConsent, tipRecommendation, type AiRequestContext } from "./client";
import type { AiFeature } from "./consent";

afterEach(() => vi.unstubAllGlobals());

const actions = [
  { name: "notes" as const, run: (ctx: AiRequestContext) => requestTidyNotes(["An example note", "", "", "", ""], ctx) },
  { name: "tips" as const, run: (ctx: AiRequestContext) => requestTipPick({ replacedId: "slow-breathing", candidates: ["grounding"], context: "", locale: "en" }, ctx) },
];

const context = { username: "synthetic-student", model: "provider/model-x" };
function browserConsent(feature?: AiFeature) {
  const data = new Map<string, string>();
  vi.stubGlobal("window", { sessionStorage: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } });
  if (feature) saveAiConsent(context.username, feature, context.model);
}

describe.each(actions)("$name: provider and account limits", ({ name, run }) => {
  it.each([
    [503, "ai_busy", "busy"],
    [429, "rate_limited", "limited"],
    [503, "ai_disabled", "error"],
    [502, "ai_unavailable", "error"],
    [401, "unauthorized", "signed_out"],
    [403, "consent_required", "consent"],
    [422, "risk_detected", "risk"],
  ])("HTTP %i %s becomes %s, without automatic retries", async (status, error, kind) => {
    const fetch = vi.fn(async () => Response.json({ error }, { status }));
    vi.stubGlobal("fetch", fetch);
    browserConsent(name);
    expect(await run(context)).toEqual({ kind });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not send anything without consent for this feature and model", async () => {
    browserConsent();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await run(context)).toEqual({ kind: "consent" });
    saveAiConsent(context.username, name === "tips" ? "notes" : "tips", context.model);
    expect(await run(context)).toEqual({ kind: "consent" });
    saveAiConsent(context.username, name, "different/model");
    expect(await run(context)).toEqual({ kind: "consent" });
    expect(await run({ ...context, username: null })).toEqual({ kind: "signed_out" });
    expect(fetch).not.toHaveBeenCalled();
    expect(hasAiConsent("other-student", name, context.model)).toBe(false);
  });

  it("sends explicit consent and a bounded abort signal; network failures do not retry", async () => {
    browserConsent(name);
    const fetch = vi.fn(async () => { throw new DOMException("synthetic timeout", "TimeoutError"); });
    vi.stubGlobal("fetch", fetch);
    expect(await run(context)).toEqual({ kind: "error" });
    expect(fetch).toHaveBeenCalledTimes(1);
    const init = (fetch.mock.calls as unknown as [string, RequestInit][])[0]![1];
    expect(JSON.parse(String(init.body)).consent).toEqual({ version: 2, feature: name, model: context.model });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const controller = new AbortController();
    controller.abort();
    expect(await run({ ...context, signal: controller.signal })).toEqual({ kind: "cancelled" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

it("refuses model prose and out-of-candidate IDs even if a server returns HTTP 200", async () => {
  browserConsent("tips");
  for (const body of [null, {}, { tipId: "invented" }, { tipId: "grounding", steps: ["invented"] }, { tipId: "grounding", reason: "invented" }]) {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
    expect(await actions[1]!.run(context)).toEqual({ kind: "error" });
  }
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ tipId: "grounding" })));
  expect(await actions[1]!.run(context)).toEqual({ kind: "ok", pick: { tipId: "grounding" } });
});

it("offers the first eligible library ID on failures, clearly marked non-AI, but never over a safety/consent failure", () => {
  for (const kind of ["error", "limited", "busy"] as const) {
    expect(tipRecommendation({ kind }, ["grounding", "worry-time"])).toEqual({ pick: { tipId: "grounding" }, source: "deterministic" });
    expect(tipRecommendation({ kind }, [])).toBeNull();
  }
  for (const kind of ["risk", "consent", "signed_out", "cancelled"] as const) {
    expect(tipRecommendation({ kind }, ["grounding"])).toBeNull();
  }
  expect(tipRecommendation({ kind: "ok", pick: { tipId: "grounding" } }, ["grounding"])).toEqual({ pick: { tipId: "grounding" }, source: "ai" });
  expect(tipRecommendation({ kind: "ok", pick: { tipId: "invented" } }, ["grounding"])).toBeNull();
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { hasAiConsent, requestTipPick, requestTidyNotes, saveAiConsent, tipRecommendation, type AiRequestContext } from "./client";
import { AI_CONSENT_VERSIONS, type AiFeature } from "./consent";
import { RISK_LIST } from "./risk-check";
import type { TipPickRequest } from "./tip-pick";

afterEach(() => vi.unstubAllGlobals());

const actions = [
  { name: "notes" as const, run: (ctx: AiRequestContext) => requestTidyNotes(["An example note", "", "", "", ""], ctx) },
  { name: "tips" as const, run: (ctx: AiRequestContext) => requestTipPick({ replacedId: "slow-breathing", candidates: ["grounding"], context: "", locale: "en", mode: "tip" }, ctx) },
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
    expect(JSON.parse(String(init.body)).consent).toEqual({ version: AI_CONSENT_VERSIONS[name], feature: name, model: context.model });
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
  const tip = (candidates: string[]) => ({ candidates, context: "", mode: "tip" as const });
  for (const kind of ["error", "limited", "busy"] as const) {
    expect(tipRecommendation({ kind }, tip(["grounding", "worry-time"]))).toEqual({ pick: { tipId: "grounding" }, source: "deterministic" });
    expect(tipRecommendation({ kind }, tip([]))).toBeNull();
    // Someone who only wanted to be heard is not handed a tip instead.
    expect(tipRecommendation({ kind }, { candidates: ["grounding"], context: "capek", mode: "listen" })).toBeNull();
  }
  for (const kind of ["risk", "consent", "signed_out", "cancelled"] as const) {
    expect(tipRecommendation({ kind }, tip(["grounding"]))).toBeNull();
  }
  expect(tipRecommendation({ kind: "ok", pick: { tipId: "grounding" } }, tip(["grounding"]))).toEqual({ pick: { tipId: "grounding" }, source: "ai" });
  expect(tipRecommendation({ kind: "ok", pick: { tipId: "invented" } }, tip(["grounding"]))).toBeNull();
});

describe("the reflection on the user's own sentence", () => {
  const request = (mode: "tip" | "listen"): TipPickRequest => ({
    replacedId: "slow-breathing", candidates: ["grounding"], context: "lagi capek banget sama tugas", locale: "id", mode,
  });
  const reflection = "Kedengarannya kamu sangat lelah karena tugas yang menumpuk.";
  const reply = async (body: unknown, mode: "tip" | "listen") => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
    return requestTipPick(request(mode), context);
  };

  it("shows a checked reflection with the tip, or alone when the user only wants to be heard", async () => {
    browserConsent("tips");
    expect(await reply({ tipId: "grounding", reflection }, "tip")).toEqual({ kind: "ok", pick: { tipId: "grounding", reflection } });
    expect(await reply({ reflection }, "listen")).toEqual({ kind: "ok", pick: { reflection } });
    const fetch = vi.fn(async () => Response.json({ reflection }));
    vi.stubGlobal("fetch", fetch);
    await requestTipPick(request("listen"), context);
    expect(JSON.parse(String((fetch.mock.calls as unknown as [string, RequestInit][])[0]![1].body)).mode).toBe("listen");
  });

  it("refuses a missing, extra, or rule-breaking reply even if a server returns HTTP 200", async () => {
    browserConsent("tips");
    const risky = RISK_LIST.phrases.id[0]!;
    for (const [body, mode] of [
      [{ tipId: "grounding" }, "tip"],
      [{ reflection }, "tip"],
      [{ tipId: "grounding", reflection }, "listen"],
      [{ reflection, steps: ["invented"] }, "listen"],
      [{ reflection: "Apa yang paling berat buatmu?" }, "listen"],
      [{ reflection: "Telepon 0800 1234 567 sekarang." }, "listen"],
      [{ reflection: `Kedengarannya kamu ${risky}.` }, "listen"],
    ] as const) {
      expect(await reply(body, mode), JSON.stringify(body)).toEqual({ kind: "error" });
    }
  });
});

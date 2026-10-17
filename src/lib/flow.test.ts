import { describe, expect, it } from "vitest";
import {
  CRISIS_GATED_ROUTES,
  PATHS,
  createInitialFlowState,
  firstUnansweredItem,
  flowReducer,
  guardRoute,
  hasDraft,
  mustShowCrisis,
  parseRoute,
  pathAfterCrisis,
  pathAfterSafety,
  resultsView,
  resumePath,
  routeNeedsState,
  sanitizeFlowState,
  type FlowEvent,
  type FlowState,
} from "./flow";
import type { AnswerValue } from "./scoring";

const GATED_PATHS = ["/hasil", "/laporan", "/tips", "/riwayat"];

function run(events: FlowEvent[], start: FlowState = createInitialFlowState()) {
  return events.reduce(flowReducer, start);
}

function answerAll(value: AnswerValue = 1): FlowEvent[] {
  return Array.from({ length: 21 }, (_, i) => ({
    type: "ANSWER_ITEM" as const,
    item: i + 1,
    value,
  }));
}

/** Consent given and all 21 items answered. */
function completedState(value: AnswerValue = 1): FlowState {
  return run([{ type: "BEGIN_SCREENING" }, ...answerAll(value)]);
}

function afterSafety(value: AnswerValue, itemValue: AnswerValue = 1): FlowState {
  return flowReducer(completedState(itemValue), { type: "ANSWER_SAFETY", value });
}

describe("parseRoute", () => {
  it.each([
    ["/", "landing"],
    ["/en", "landing"],
    ["/mulai", "mulai"],
    ["/en/mulai", "mulai"],
    ["/keamanan", "keamanan"],
    ["/krisis", "krisis"],
    ["/hasil", "hasil"],
    ["/hasil/", "hasil"],
    ["/HASIL", "hasil"],
    ["/en/hasil?x=1", "hasil"],
    ["/laporan", "laporan"],
    ["/tips", "tips"],
    ["/riwayat", "riwayat"],
    ["/something-else", "other"],
  ])("%s → %s", (path, name) => {
    expect(parseRoute(path).name).toBe(name);
  });

  it("reads the question number", () => {
    expect(parseRoute("/skrining/7")).toEqual({ name: "skrining", question: 7 });
    expect(parseRoute("/en/skrining/21")).toEqual({ name: "skrining", question: 21 });
    expect(parseRoute("/skrining/abc").question).toBeNaN();
    expect(parseRoute("/skrining").question).toBeNaN();
    expect(parseRoute("/skrining/1/2").question).toBeNaN();
  });

  it("marks routes that need persisted state", () => {
    expect(routeNeedsState("/")).toBe(false);
    expect(routeNeedsState("/krisis")).toBe(false);
    expect(routeNeedsState("/mulai")).toBe(false);
    expect(routeNeedsState("/skrining/3")).toBe(true);
    for (const path of GATED_PATHS) expect(routeNeedsState(path)).toBe(true);
  });

  it("gates every result-derived route", () => {
    expect([...CRISIS_GATED_ROUTES].sort()).toEqual(
      ["hasil", "laporan", "riwayat", "tips"].sort(),
    );
  });
});

describe("happy path: landing → mulai → skrining → keamanan → hasil", () => {
  it("walks the whole flow with safety answer 0", () => {
    let state = createInitialFlowState();
    expect(guardRoute(state, "/")).toBeNull();
    expect(guardRoute(state, "/mulai")).toBeNull();
    expect(guardRoute(state, "/skrining/1")).toBe(PATHS.mulai);

    state = flowReducer(state, { type: "BEGIN_SCREENING" });
    expect(guardRoute(state, "/skrining/1")).toBeNull();
    expect(resumePath(state)).toBe("/skrining/1");

    for (let item = 1; item <= 21; item++) {
      expect(guardRoute(state, `/skrining/${item}`)).toBeNull();
      expect(guardRoute(state, PATHS.keamanan)).toBe(`/skrining/${item}`);
      state = flowReducer(state, { type: "ANSWER_ITEM", item, value: 2 });
    }

    expect(guardRoute(state, PATHS.keamanan)).toBeNull();
    expect(guardRoute(state, PATHS.hasil)).toBe(PATHS.keamanan);

    state = flowReducer(state, { type: "ANSWER_SAFETY", value: 0 });
    expect(mustShowCrisis(state)).toBe(false);
    expect(pathAfterSafety(state)).toBe(PATHS.hasil);
    expect(guardRoute(state, PATHS.hasil)).toBeNull();
    expect(resultsView(state)?.result.depression.score).toBe(28);
  });
});

describe("screening guard (SK-03, SK-04, SK-05)", () => {
  it("cannot skip ahead past the first unanswered item", () => {
    const state = run([
      { type: "BEGIN_SCREENING" },
      { type: "ANSWER_ITEM", item: 1, value: 0 },
      { type: "ANSWER_ITEM", item: 2, value: 3 },
    ]);
    expect(firstUnansweredItem(state)).toBe(3);
    expect(guardRoute(state, "/skrining/3")).toBeNull();
    expect(guardRoute(state, "/skrining/4")).toBe("/skrining/3");
    expect(guardRoute(state, "/skrining/21")).toBe("/skrining/3");
  });

  it("allows going back to answered items", () => {
    const state = completedState();
    for (let item = 1; item <= 21; item++) {
      expect(guardRoute(state, `/skrining/${item}`)).toBeNull();
    }
  });

  it("redirects malformed question numbers", () => {
    const state = run([{ type: "BEGIN_SCREENING" }]);
    expect(guardRoute(state, "/skrining/0")).toBe("/skrining/1");
    expect(guardRoute(state, "/skrining/22")).toBe("/skrining/1");
    expect(guardRoute(state, "/skrining/abc")).toBe("/skrining/1");
  });

  it("keeps and changes earlier answers", () => {
    const state = run([
      { type: "BEGIN_SCREENING" },
      { type: "ANSWER_ITEM", item: 1, value: 2 },
      { type: "ANSWER_ITEM", item: 1, value: 3 },
    ]);
    expect(state.answers[0]).toBe(3);
  });

  it("ignores answers before consent and invalid answers", () => {
    const noConsent = flowReducer(createInitialFlowState(), {
      type: "ANSWER_ITEM",
      item: 1,
      value: 2,
    });
    expect(noConsent.answers[0]).toBeNull();

    const consented = run([{ type: "BEGIN_SCREENING" }]);
    expect(flowReducer(consented, { type: "ANSWER_ITEM", item: 0, value: 1 })).toBe(
      consented,
    );
    expect(flowReducer(consented, { type: "ANSWER_ITEM", item: 22, value: 1 })).toBe(
      consented,
    );
    expect(
      flowReducer(consented, { type: "ANSWER_ITEM", item: 1, value: 4 as AnswerValue }),
    ).toBe(consented);
  });

  it("resumes from the last unanswered question", () => {
    const state = run([
      { type: "BEGIN_SCREENING" },
      ...answerAll(1).slice(0, 6),
    ]);
    expect(hasDraft(state)).toBe(true);
    expect(resumePath(state)).toBe("/skrining/7");
  });

  it("a started screening with no answers yet can still be resumed (STAR-004)", () => {
    const started = run([{ type: "BEGIN_SCREENING" }]);
    expect(hasDraft(started)).toBe(true);
    expect(resumePath(started)).toBe("/skrining/1");
    expect(hasDraft(createInitialFlowState())).toBe(false);
  });

  it("a finished screening is not a draft", () => {
    expect(hasDraft(afterSafety(0))).toBe(false);
  });

  it("does not accept a safety answer before all 21 items", () => {
    const state = run([{ type: "BEGIN_SCREENING" }, ...answerAll(1).slice(0, 20)]);
    expect(flowReducer(state, { type: "ANSWER_SAFETY", value: 2 })).toBe(state);
  });
});

describe("K2: safety answer > 0 always opens the crisis screen", () => {
  it.each([1, 2, 3] as const)("safety answer %i → crisis_pending → /krisis", (value) => {
    const state = afterSafety(value);
    expect(state.crisis).toBe("crisis_pending");
    expect(state.crisisSource).toBe("safety_question");
    expect(mustShowCrisis(state)).toBe(true);
    expect(pathAfterSafety(state)).toBe(PATHS.krisis);
    expect(resultsView(state)).toBeNull();
  });

  it("safety answer 0 → results, without claiming anything is safe", () => {
    const state = afterSafety(0);
    expect(state.crisis).toBe("none");
    expect(pathAfterSafety(state)).toBe(PATHS.hasil);
  });

  it("re-triggers the crisis when a positive answer is given again", () => {
    let state = afterSafety(2);
    state = flowReducer(state, { type: "ACKNOWLEDGE_CRISIS" });
    state = flowReducer(state, { type: "ANSWER_SAFETY", value: 1 });
    expect(state.crisis).toBe("crisis_pending");
  });
});

describe("K3: the crisis screen cannot be skipped", () => {
  it.each(GATED_PATHS)("%s redirects to /krisis while crisis_pending", (path) => {
    const state = afterSafety(3);
    expect(guardRoute(state, path)).toBe(PATHS.krisis);
    expect(guardRoute(state, `/en${path}`)).toBe(PATHS.krisis);
  });

  it("the crisis gate is checked before any other rule", () => {
    // Help-now pressed on the landing page with no screening at all.
    const state = flowReducer(createInitialFlowState(), {
      type: "REQUEST_HELP",
      from: "/",
    });
    for (const path of GATED_PATHS) {
      expect(guardRoute(state, path)).toBe(PATHS.krisis);
    }
  });

  it("the crisis screen itself is always reachable", () => {
    expect(guardRoute(afterSafety(2), PATHS.krisis)).toBeNull();
    expect(guardRoute(createInitialFlowState(), PATHS.krisis)).toBeNull();
  });

  it("changing the safety answer back to 0 does not clear crisis_pending", () => {
    let state = afterSafety(2);
    state = flowReducer(state, { type: "ANSWER_SAFETY", value: 0 });
    expect(state.safetyAnswer).toBe(0);
    expect(state.crisis).toBe("crisis_pending");
    expect(pathAfterSafety(state)).toBe(PATHS.krisis);
    expect(guardRoute(state, PATHS.hasil)).toBe(PATHS.krisis);
  });

  it("starting a new screening does not clear crisis_pending", () => {
    let state = afterSafety(1);
    state = flowReducer(state, { type: "BEGIN_SCREENING" });
    expect(state.answers.every((a) => a === null)).toBe(true);
    expect(state.crisis).toBe("crisis_pending");
    for (const path of GATED_PATHS) {
      expect(guardRoute(state, path)).toBe(PATHS.krisis);
    }
  });

  it("clearing device data does not clear crisis_pending", () => {
    let state = afterSafety(3);
    state = flowReducer(state, { type: "CLEAR_DEVICE_DATA" });
    expect(state.safetyAnswer).toBeNull();
    expect(state.crisis).toBe("crisis_pending");
    expect(guardRoute(state, PATHS.hasil)).toBe(PATHS.krisis);
  });

  it("only acknowledging the crisis screen clears crisis_pending", () => {
    let state = afterSafety(2);
    state = flowReducer(state, { type: "ACKNOWLEDGE_CRISIS" });
    expect(state.crisis).toBe("crisis_acknowledged");
    expect(mustShowCrisis(state)).toBe(false);
    expect(guardRoute(state, PATHS.hasil)).toBeNull();
    expect(pathAfterCrisis(state)).toBe(PATHS.hasil);
  });

  it("a positive safety answer without acknowledgement still gates (tampered state)", () => {
    const tampered: FlowState = { ...afterSafety(2), crisis: "none" };
    expect(mustShowCrisis(tampered)).toBe(true);
    expect(guardRoute(tampered, PATHS.hasil)).toBe(PATHS.krisis);
    const fixed = flowReducer(tampered, { type: "ACKNOWLEDGE_CRISIS" });
    expect(fixed.crisis).toBe("crisis_acknowledged");
  });

  it("restored storage keeps the gate (refresh)", () => {
    const stored = JSON.parse(JSON.stringify(afterSafety(1))) as unknown;
    const restored = sanitizeFlowState(stored);
    expect(restored.crisis).toBe("crisis_pending");
    expect(guardRoute(restored, PATHS.hasil)).toBe(PATHS.krisis);
  });

  it("restored storage with a positive answer but no crisis flag still gates", () => {
    const stored = { ...afterSafety(2), crisis: "garbage" };
    const restored = sanitizeFlowState(stored);
    expect(mustShowCrisis(restored)).toBe(true);
    expect(guardRoute(restored, PATHS.tips)).toBe(PATHS.krisis);
  });
});

describe("K4: the gate covers both branches", () => {
  it("download (/laporan) and tips (/tips) both pass through the crisis first", () => {
    const state = afterSafety(1);
    expect(guardRoute(state, PATHS.laporan)).toBe(PATHS.krisis);
    expect(guardRoute(state, PATHS.tips)).toBe(PATHS.krisis);
    const acknowledged = flowReducer(state, { type: "ACKNOWLEDGE_CRISIS" });
    expect(guardRoute(acknowledged, PATHS.laporan)).toBeNull();
    expect(guardRoute(acknowledged, PATHS.tips)).toBeNull();
  });
});

describe("help-now button (GL-01)", () => {
  it("sets crisis_pending and remembers where to return", () => {
    const state = run([
      { type: "BEGIN_SCREENING" },
      ...answerAll(1).slice(0, 6),
      { type: "REQUEST_HELP", from: "/skrining/7" },
    ]);
    expect(state.crisis).toBe("crisis_pending");
    expect(state.crisisSource).toBe("help_now");
    expect(state.crisisReturnTo).toBe("/skrining/7");
    expect(guardRoute(state, "/skrining/7")).toBeNull();
    const after = flowReducer(state, { type: "ACKNOWLEDGE_CRISIS" });
    expect(pathAfterCrisis(after)).toBe("/skrining/7");
    expect(after.answers.slice(0, 6)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("from the results page, gates results until confirmed", () => {
    let state = afterSafety(0);
    state = flowReducer(state, { type: "REQUEST_HELP", from: "/hasil" });
    expect(guardRoute(state, PATHS.hasil)).toBe(PATHS.krisis);
    state = flowReducer(state, { type: "ACKNOWLEDGE_CRISIS" });
    expect(pathAfterCrisis(state)).toBe(PATHS.hasil);
  });

  it("strips the locale and rejects unsafe return paths", () => {
    const fromEn = flowReducer(createInitialFlowState(), {
      type: "REQUEST_HELP",
      from: "/en/mulai",
    });
    expect(fromEn.crisisReturnTo).toBe("/mulai");
    for (const from of ["//evil.example", "https://evil.example", "/krisis", null]) {
      const state = flowReducer(createInitialFlowState(), { type: "REQUEST_HELP", from });
      expect(state.crisisReturnTo).toBeNull();
    }
  });

  it("does not overwrite a pending safety crisis", () => {
    const state = afterSafety(2);
    const again = flowReducer(state, { type: "REQUEST_HELP", from: "/" });
    expect(again).toBe(state);
    expect(again.crisisSource).toBe("safety_question");
  });

  it("after confirming with nothing to return to, goes to the landing page", () => {
    let state = flowReducer(createInitialFlowState(), { type: "REQUEST_HELP", from: null });
    state = flowReducer(state, { type: "ACKNOWLEDGE_CRISIS" });
    expect(pathAfterCrisis(state)).toBe(PATHS.landing);
  });

  it("acknowledging without a pending crisis changes nothing", () => {
    const state = createInitialFlowState();
    expect(flowReducer(state, { type: "ACKNOWLEDGE_CRISIS" })).toBe(state);
  });
});

describe("results gating and panels", () => {
  it("requires consent, all items, and the safety answer", () => {
    expect(guardRoute(createInitialFlowState(), PATHS.hasil)).toBe(PATHS.mulai);
    const partial = run([{ type: "BEGIN_SCREENING" }, ...answerAll(1).slice(0, 4)]);
    expect(guardRoute(partial, PATHS.hasil)).toBe("/skrining/5");
    expect(guardRoute(completedState(), PATHS.hasil)).toBe(PATHS.keamanan);
  });

  it("K5: extremely severe depression shows the priority panel", () => {
    // All items answered 2 → depression 28, anxiety 28, stress 28.
    const view = resultsView(afterSafety(0, 2));
    expect(view?.showPriorityPanel).toBe(true);
    expect(view?.showSupportFirst).toBe(true);
  });

  it("normal scores show no priority panel", () => {
    const view = resultsView(afterSafety(0, 0));
    expect(view?.showPriorityPanel).toBe(false);
    expect(view?.showSupportFirst).toBe(false);
  });

  it("PRD 9.5: support stays visible after a positive answer is withdrawn", () => {
    let state = afterSafety(2, 0);
    state = flowReducer(state, { type: "ACKNOWLEDGE_CRISIS" });
    state = flowReducer(state, { type: "ANSWER_SAFETY", value: 0 });
    expect(state.safetyEverPositive).toBe(true);
    expect(resultsView(state)?.showSupportFirst).toBe(true);
  });
});

describe("new screening and clearing data", () => {
  it("BEGIN_SCREENING keeps a draft in progress", () => {
    const draft = run([{ type: "BEGIN_SCREENING" }, ...answerAll(2).slice(0, 5)]);
    const again = flowReducer(draft, { type: "BEGIN_SCREENING" });
    expect(again.answers.slice(0, 5)).toEqual([2, 2, 2, 2, 2]);
  });

  it("BEGIN_SCREENING after a finished screening starts fresh", () => {
    const finished = afterSafety(0, 2);
    const fresh = flowReducer(finished, { type: "BEGIN_SCREENING" });
    expect(fresh.answers.every((a) => a === null)).toBe(true);
    expect(fresh.safetyAnswer).toBeNull();
    expect(fresh.consentGiven).toBe(true);
  });

  it("CLEAR_DEVICE_DATA resets everything when no crisis is pending", () => {
    const cleared = flowReducer(afterSafety(0, 2), { type: "CLEAR_DEVICE_DATA" });
    expect(cleared).toEqual(createInitialFlowState());
  });
});

describe("completion details for the report (PRD 12)", () => {
  it("records when and in which language the screening finished", () => {
    const state = flowReducer(completedState(), {
      type: "ANSWER_SAFETY",
      value: 0,
      at: "2026-10-17T05:30:00.000Z",
      locale: "en",
    });
    expect(state.completedAt).toBe("2026-10-17T05:30:00.000Z");
    expect(state.completedLocale).toBe("en");
  });

  it("records completion even when the safety answer opens the crisis screen", () => {
    const state = flowReducer(completedState(), {
      type: "ANSWER_SAFETY",
      value: 2,
      at: "2026-10-17T05:30:00.000Z",
      locale: "id",
    });
    expect(state.crisis).toBe("crisis_pending");
    expect(state.completedAt).toBe("2026-10-17T05:30:00.000Z");
  });

  it("starting a new screening clears the completion details", () => {
    let state = flowReducer(completedState(), {
      type: "ANSWER_SAFETY",
      value: 0,
      at: "2026-10-17T05:30:00.000Z",
      locale: "id",
    });
    state = flowReducer(state, { type: "BEGIN_SCREENING" });
    expect(state.completedAt).toBeNull();
    expect(state.completedLocale).toBeNull();
  });

  it("sanitizes stored completion details", () => {
    const restored = sanitizeFlowState({ completedAt: "not a date", completedLocale: "fr" });
    expect(restored.completedAt).toBeNull();
    expect(restored.completedLocale).toBeNull();
    const valid = sanitizeFlowState({ completedAt: "2026-10-17T05:30:00.000Z", completedLocale: "id" });
    expect(valid.completedAt).toBe("2026-10-17T05:30:00.000Z");
    expect(valid.completedLocale).toBe("id");
  });
});

describe("sanitizeFlowState", () => {
  it("falls back to the initial state for garbage", () => {
    expect(sanitizeFlowState(null)).toEqual(createInitialFlowState());
    expect(sanitizeFlowState("x")).toEqual(createInitialFlowState());
    expect(sanitizeFlowState({ answers: "nope" })).toEqual(createInitialFlowState());
  });

  it("drops invalid answers and keeps valid ones", () => {
    const restored = sanitizeFlowState({
      ageConfirmed: true,
      consentGiven: true,
      answers: [0, 1, 2, 3, 4, -1, "2", null],
    });
    expect(restored.answers.slice(0, 8)).toEqual([0, 1, 2, 3, null, null, null, null]);
    expect(restored.answers).toHaveLength(21);
  });
});

/**
 * Screening flow state machine and crisis gate (PRD 7, 9.2, 9.6).
 *
 * landing → mulai → skrining/1…21 → keamanan → krisis (if needed) → hasil
 *
 * Everything here is pure: the store dispatches events through `flowReducer`
 * and the router guard asks `guardRoute` where a path may go. The crisis
 * decision happens only in the browser; nothing is sent anywhere.
 *
 * Non-negotiable rules (Safety Contract K2–K4):
 * - Any safety answer > 0, or pressing "Butuh bantuan sekarang", sets
 *   `crisis_pending`.
 * - Only `ACKNOWLEDGE_CRISIS` (the confirm button on the crisis screen) clears
 *   `crisis_pending`. Changing the safety answer, starting over, or clearing
 *   the device never does.
 * - While a crisis must be shown, every crisis-gated route redirects to
 *   /krisis, regardless of how it was reached (link, back, refresh, URL).
 */

import {
  DASS21_ITEM_COUNT,
  isAnswerValue,
  isComplete,
  meetsPriorityThreshold,
  scoreDass21,
  type AnswerValue,
  type Dass21Result,
} from "./scoring";

export const FLOW_STATE_VERSION = 1;

export type CrisisStatus = "none" | "crisis_pending" | "crisis_acknowledged";
export type CrisisSource = "safety_question" | "help_now";

export interface FlowState {
  /** User confirmed they are 18 or older (LO-04). */
  ageConfirmed: boolean;
  /** User ticked the consent checkbox (LO-05). */
  consentGiven: boolean;
  /** DASS-21 answers in original item order; index 0 is item 1. */
  answers: (AnswerValue | null)[];
  /** PHQ-9 item 9 answer (0–3). Never part of the DASS-21 score. */
  safetyAnswer: AnswerValue | null;
  crisis: CrisisStatus;
  crisisSource: CrisisSource | null;
  /** Where a help-now crisis returns to after confirmation. */
  crisisReturnTo: string | null;
  /** The safety answer was > 0 at some point this session (PRD 9.5). */
  safetyEverPositive: boolean;
}

export type FlowEvent =
  /** Age ≥ 18 confirmed and consent given on /mulai. */
  | { type: "BEGIN_SCREENING" }
  /** `item` is 1-based. */
  | { type: "ANSWER_ITEM"; item: number; value: AnswerValue }
  | { type: "ANSWER_SAFETY"; value: AnswerValue }
  /** "Butuh bantuan sekarang". `from` is the app path the user was on. */
  | { type: "REQUEST_HELP"; from: string | null }
  /** Confirm button on the crisis screen. */
  | { type: "ACKNOWLEDGE_CRISIS" }
  /** "Hapus dari perangkat ini" / start over. */
  | { type: "CLEAR_DEVICE_DATA" };

export function createInitialFlowState(): FlowState {
  return {
    ageConfirmed: false,
    consentGiven: false,
    answers: Array.from({ length: DASS21_ITEM_COUNT }, () => null),
    safetyAnswer: null,
    crisis: "none",
    crisisSource: null,
    crisisReturnTo: null,
    safetyEverPositive: false,
  };
}

/* ------------------------------------------------------------------------ */
/* Routes                                                                   */
/* ------------------------------------------------------------------------ */

export const PATHS = {
  landing: "/",
  mulai: "/mulai",
  question: (n: number) => `/skrining/${n}`,
  keamanan: "/keamanan",
  krisis: "/krisis",
  hasil: "/hasil",
  laporan: "/laporan",
  tips: "/tips",
  riwayat: "/riwayat",
} as const;

export type RouteName =
  | "landing"
  | "mulai"
  | "skrining"
  | "keamanan"
  | "krisis"
  | "hasil"
  | "laporan"
  | "tips"
  | "riwayat"
  | "other";

export interface ParsedRoute {
  name: RouteName;
  /** For `skrining`: the requested question number, or NaN when malformed. */
  question?: number;
}

/**
 * Routes that must never be shown while a crisis is pending (PRD 9.6).
 * Every route derived from screening results belongs here.
 */
export const CRISIS_GATED_ROUTES: readonly RouteName[] = [
  "hasil",
  "laporan",
  "tips",
  "riwayat",
];

/** Routes whose guard depends on persisted state. */
const STATEFUL_ROUTES: readonly RouteName[] = [
  "skrining",
  "keamanan",
  ...CRISIS_GATED_ROUTES,
];

const LOCALE_PREFIX = /^\/(id|en)(?=\/|$)/;

/** Parses an app path. A leading locale segment is ignored. */
export function parseRoute(pathname: string): ParsedRoute {
  const path = pathname.split(/[?#]/)[0] ?? "";
  const withoutLocale = path.replace(LOCALE_PREFIX, "");
  const segments = withoutLocale
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());

  const [first, second, ...rest] = segments;
  if (first === undefined) return { name: "landing" };

  switch (first) {
    case "skrining": {
      const question =
        second !== undefined && rest.length === 0 && /^\d+$/.test(second)
          ? Number(second)
          : Number.NaN;
      return { name: "skrining", question };
    }
    case "mulai":
    case "keamanan":
    case "krisis":
    case "hasil":
    case "laporan":
    case "tips":
    case "riwayat":
      return { name: first };
    default:
      return { name: "other" };
  }
}

export function isCrisisGated(name: RouteName): boolean {
  return CRISIS_GATED_ROUTES.includes(name);
}

/** True when the route can only be decided after persisted state has loaded. */
export function routeNeedsState(pathname: string): boolean {
  return STATEFUL_ROUTES.includes(parseRoute(pathname).name);
}

/* ------------------------------------------------------------------------ */
/* Selectors                                                                */
/* ------------------------------------------------------------------------ */

/** 1-based number of the first unanswered item, or null when all are answered. */
export function firstUnansweredItem(state: FlowState): number | null {
  const index = state.answers.findIndex((answer) => !isAnswerValue(answer));
  return index === -1 ? null : index + 1;
}

export function answeredCount(state: FlowState): number {
  return state.answers.filter((answer) => isAnswerValue(answer)).length;
}

export function hasConsent(state: FlowState): boolean {
  return state.ageConfirmed && state.consentGiven;
}

export function isScreeningComplete(state: FlowState): boolean {
  return isComplete(state.answers);
}

/** All 21 items and the safety question are answered. */
export function isScreeningFinished(state: FlowState): boolean {
  return isScreeningComplete(state) && state.safetyAnswer !== null;
}

/**
 * A screening was started but not finished. Starting means passing /mulai
 * (age and consent), even before the first answer.
 */
export function hasDraft(state: FlowState): boolean {
  return (hasConsent(state) || answeredCount(state) > 0) && !isScreeningFinished(state);
}

/**
 * True when the crisis screen must be shown before any gated route.
 * A positive safety answer that was never acknowledged also counts, so a
 * tampered or legacy state can never skip the crisis screen.
 */
export function mustShowCrisis(state: FlowState): boolean {
  if (state.crisis === "crisis_pending") return true;
  return (
    state.safetyAnswer !== null &&
    state.safetyAnswer > 0 &&
    state.crisis !== "crisis_acknowledged"
  );
}

/** Where the screening should continue from. */
export function resumePath(state: FlowState): string {
  if (!hasConsent(state)) return PATHS.mulai;
  const next = firstUnansweredItem(state);
  if (next !== null) return PATHS.question(next);
  if (state.safetyAnswer === null) return PATHS.keamanan;
  return mustShowCrisis(state) ? PATHS.krisis : PATHS.hasil;
}

/** Route after submitting the safety question (SK-08, K2). */
export function pathAfterSafety(state: FlowState): string {
  return mustShowCrisis(state) ? PATHS.krisis : PATHS.hasil;
}

/** Route after confirming the crisis screen. */
export function pathAfterCrisis(state: FlowState): string {
  if (state.crisisReturnTo) return state.crisisReturnTo;
  if (isScreeningFinished(state)) return PATHS.hasil;
  if (hasDraft(state)) return resumePath(state);
  return PATHS.landing;
}

export interface ResultsView {
  result: Dass21Result;
  /** "Prioritas" panel (PRD 9.2, HS-07, K5). */
  showPriorityPanel: boolean;
  /** Keep the help directory near the top (PRD 9.5). */
  showSupportFirst: boolean;
}

/** Everything the results page needs, or null when results are not available. */
export function resultsView(state: FlowState): ResultsView | null {
  if (!isScreeningFinished(state) || mustShowCrisis(state)) return null;
  const result = scoreDass21(state.answers);
  if (!result) return null;
  const showPriorityPanel = meetsPriorityThreshold(result);
  return {
    result,
    showPriorityPanel,
    showSupportFirst:
      showPriorityPanel ||
      state.safetyEverPositive ||
      (state.safetyAnswer ?? 0) > 0,
  };
}

/* ------------------------------------------------------------------------ */
/* Router guard                                                             */
/* ------------------------------------------------------------------------ */

/**
 * Returns the path a visit to `pathname` must be redirected to, or null when
 * the visit is allowed. The crisis gate is checked before anything else.
 */
export function guardRoute(state: FlowState, pathname: string): string | null {
  const route = parseRoute(pathname);

  if (isCrisisGated(route.name) && mustShowCrisis(state)) {
    return PATHS.krisis;
  }

  switch (route.name) {
    case "skrining": {
      if (!hasConsent(state)) return PATHS.mulai;
      const furthest = firstUnansweredItem(state) ?? DASS21_ITEM_COUNT;
      const n = route.question ?? Number.NaN;
      if (!Number.isInteger(n) || n < 1 || n > DASS21_ITEM_COUNT || n > furthest) {
        return PATHS.question(furthest);
      }
      return null;
    }
    case "keamanan": {
      if (!hasConsent(state)) return PATHS.mulai;
      const next = firstUnansweredItem(state);
      return next === null ? null : PATHS.question(next);
    }
    case "hasil":
    case "laporan": {
      if (!hasConsent(state)) return PATHS.mulai;
      const next = firstUnansweredItem(state);
      if (next !== null) return PATHS.question(next);
      if (state.safetyAnswer === null) return PATHS.keamanan;
      return null;
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------------ */
/* Reducer                                                                  */
/* ------------------------------------------------------------------------ */

/** Accepts only internal app paths, never the crisis screen itself. */
function sanitizeReturnPath(from: string | null): string | null {
  if (!from || !from.startsWith("/") || from.startsWith("//")) return null;
  const route = parseRoute(from);
  if (route.name === "krisis" || route.name === "other") return null;
  return from.replace(LOCALE_PREFIX, "") || PATHS.landing;
}

/** Keeps a pending crisis across resets: only acknowledging may clear it. */
function preservePendingCrisis(previous: FlowState, next: FlowState): FlowState {
  if (!mustShowCrisis(previous)) return next;
  return {
    ...next,
    crisis: "crisis_pending",
    crisisSource: previous.crisisSource ?? "safety_question",
    crisisReturnTo: null,
    safetyEverPositive: previous.safetyEverPositive,
  };
}

export function flowReducer(state: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case "BEGIN_SCREENING": {
      const base = isScreeningFinished(state)
        ? preservePendingCrisis(state, createInitialFlowState())
        : state;
      return { ...base, ageConfirmed: true, consentGiven: true };
    }

    case "ANSWER_ITEM": {
      if (!hasConsent(state)) return state;
      if (
        !Number.isInteger(event.item) ||
        event.item < 1 ||
        event.item > DASS21_ITEM_COUNT ||
        !isAnswerValue(event.value)
      ) {
        return state;
      }
      const answers = [...state.answers];
      answers[event.item - 1] = event.value;
      return { ...state, answers };
    }

    case "ANSWER_SAFETY": {
      if (!isScreeningComplete(state) || !isAnswerValue(event.value)) return state;
      if (event.value > 0) {
        // Binary trigger (PRD 9.1): any answer above 0 opens the crisis screen.
        return {
          ...state,
          safetyAnswer: event.value,
          crisis: "crisis_pending",
          crisisSource: "safety_question",
          crisisReturnTo: null,
          safetyEverPositive: true,
        };
      }
      // Answering 0 never clears a pending crisis.
      return { ...state, safetyAnswer: 0 };
    }

    case "REQUEST_HELP": {
      if (state.crisis === "crisis_pending") return state;
      return {
        ...state,
        crisis: "crisis_pending",
        crisisSource: "help_now",
        crisisReturnTo: sanitizeReturnPath(event.from),
      };
    }

    case "ACKNOWLEDGE_CRISIS": {
      if (state.crisis !== "crisis_pending" && !mustShowCrisis(state)) return state;
      return { ...state, crisis: "crisis_acknowledged" };
    }

    case "CLEAR_DEVICE_DATA":
      return preservePendingCrisis(state, createInitialFlowState());

    default:
      return state;
  }
}

/* ------------------------------------------------------------------------ */
/* Persistence                                                              */
/* ------------------------------------------------------------------------ */

const CRISIS_STATUSES: readonly CrisisStatus[] = [
  "none",
  "crisis_pending",
  "crisis_acknowledged",
];
const CRISIS_SOURCES: readonly CrisisSource[] = ["safety_question", "help_now"];

/**
 * Rebuilds a valid state from untrusted storage. Malformed fields fall back
 * to safe defaults; a positive safety answer always keeps the crisis gate.
 */
export function sanitizeFlowState(input: unknown): FlowState {
  const initial = createInitialFlowState();
  if (typeof input !== "object" || input === null) return initial;
  const raw = input as Record<string, unknown>;

  const answers = Array.isArray(raw.answers)
    ? initial.answers.map((_, i) => {
        const value = (raw.answers as unknown[])[i];
        return isAnswerValue(value) ? value : null;
      })
    : initial.answers;

  const safetyAnswer = isAnswerValue(raw.safetyAnswer) ? raw.safetyAnswer : null;
  const crisis = CRISIS_STATUSES.includes(raw.crisis as CrisisStatus)
    ? (raw.crisis as CrisisStatus)
    : "none";
  const crisisSource = CRISIS_SOURCES.includes(raw.crisisSource as CrisisSource)
    ? (raw.crisisSource as CrisisSource)
    : null;
  const crisisReturnTo =
    typeof raw.crisisReturnTo === "string"
      ? sanitizeReturnPath(raw.crisisReturnTo)
      : null;

  return {
    ageConfirmed: raw.ageConfirmed === true,
    consentGiven: raw.consentGiven === true,
    answers,
    safetyAnswer,
    crisis,
    crisisSource,
    crisisReturnTo,
    safetyEverPositive:
      raw.safetyEverPositive === true || (safetyAnswer !== null && safetyAnswer > 0),
  };
}

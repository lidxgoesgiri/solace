/**
 * Aggregate counters (PRD 4): one number per event per day, without any
 * identifier. There is deliberately no crisis event: nothing is ever sent
 * because someone is in a crisis (PRD 9.6).
 */
export const METRIC_EVENTS = [
  "screening_started",
  "results_viewed",
  "report_downloaded",
  "tips_opened",
  "account_created",
] as const;
export type MetricEvent = (typeof METRIC_EVENTS)[number];

export function isMetricEvent(value: unknown): value is MetricEvent {
  return METRIC_EVENTS.includes(value as MetricEvent);
}

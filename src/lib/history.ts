/**
 * History and trends (RW-01–RW-05). Pure functions over saved screenings;
 * categories always come from the one scoring function (HS-01).
 */

import { SEVERITIES, SUBSCALES, type Dass21Result, type Severity, type Subscale } from "./scoring";

const DAY_MS = 24 * 60 * 60 * 1000;

/** RW-03: suggest screening again 14 days after the last one. */
export const REMINDER_AFTER_DAYS = 14;
/** "Remind me later" hides the banner for a week. */
export const REMINDER_SNOOZE_DAYS = 7;

export function daysSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - Date.parse(iso)) / DAY_MS);
}

export function reminderDue(
  lastCompletedAt: string | null,
  now: Date,
  snoozedUntil: string | null,
): boolean {
  if (!lastCompletedAt) return false;
  if (snoozedUntil && Date.parse(snoozedUntil) > now.getTime()) return false;
  return daysSince(lastCompletedAt, now) >= REMINDER_AFTER_DAYS;
}

export function snoozeUntil(now: Date): string {
  return new Date(now.getTime() + REMINDER_SNOOZE_DAYS * DAY_MS).toISOString();
}

export type TrendDirection = "up" | "down" | "same";

export interface SubscaleTrend {
  from: Severity;
  to: Severity;
  direction: TrendDirection;
}

/**
 * RW-02: change in category between two screenings, described by category
 * rather than raw numbers. "up" means more symptoms.
 */
export function trendBetween(
  previous: Dass21Result,
  latest: Dass21Result,
): Record<Subscale, SubscaleTrend> {
  const out = {} as Record<Subscale, SubscaleTrend>;
  for (const subscale of SUBSCALES) {
    const from = previous[subscale].severity;
    const to = latest[subscale].severity;
    const diff = SEVERITIES.indexOf(to) - SEVERITIES.indexOf(from);
    out[subscale] = { from, to, direction: diff > 0 ? "up" : diff < 0 ? "down" : "same" };
  }
  return out;
}

const SEVERE = SEVERITIES.indexOf("severe");

/** RW-05: subscales that rose into severe or extremely severe since the previous screening. */
export function newlySevere(previous: Dass21Result, latest: Dass21Result): Subscale[] {
  return SUBSCALES.filter(
    (subscale) =>
      SEVERITIES.indexOf(latest[subscale].severity) >= SEVERE &&
      SEVERITIES.indexOf(latest[subscale].severity) >
        SEVERITIES.indexOf(previous[subscale].severity),
  );
}

/** Local calendar day as YYYY-MM-DD (check-ins are once per day, RW-04). */
export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

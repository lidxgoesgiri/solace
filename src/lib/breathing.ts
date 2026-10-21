/** TP-05: one uninterrupted 4-second inhale, 6-second exhale. No hold. */
export const BREATH_CYCLE_MS = 10_000;
export const INHALE_MS = 4_000;

/** Derive everything from elapsed time, never from a count of timer callbacks. */
export function breathAt(elapsedMs: number) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const position = elapsed % BREATH_CYCLE_MS;
  const inhale = position < INHALE_MS;
  const remaining = inhale ? INHALE_MS - position : BREATH_CYCLE_MS - position;
  return {
    phase: inhale ? "in" as const : "out" as const,
    seconds: Math.ceil(remaining / 1_000),
    // A skipped cycle is not a new vibration opportunity.
    segment: Math.floor(elapsed / BREATH_CYCLE_MS) * 2 + (inhale ? 0 : 1),
  };
}

/** Never replay missed pulses after lag or returning from a background tab. */
export function shouldPulse(previous: number, next: number, gapMs: number) {
  return next === previous + 1 && gapMs >= 0 && gapMs < 500;
}

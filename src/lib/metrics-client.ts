import type { MetricEvent } from "./metrics";

/**
 * Counts one event on Solace's own server (same origin, no cookie needed,
 * nothing else attached). Fire-and-forget: a failure changes nothing.
 */
export function trackEvent(event: MetricEvent): void {
  try {
    const body = JSON.stringify({ event });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/metrics", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/metrics", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch {
    // Counting is never allowed to break the page.
  }
}

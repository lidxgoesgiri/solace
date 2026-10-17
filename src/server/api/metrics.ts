/**
 * Aggregate counters (PRD 4): one number per event per day. No user id, no
 * IP, no cookie, no third party. Nothing is ever counted because of a crisis
 * (PRD 9.6), so there is no crisis event.
 */

import { sql } from "drizzle-orm";
import type { ApiContext } from "../context";
import { clientIp, fail, isRecord, json, readJson } from "../http";
import { isMetricEvent } from "@/lib/metrics";
import { LIMITS } from "../rate-limit";

export { METRIC_EVENTS, isMetricEvent, type MetricEvent } from "@/lib/metrics";

/** POST /api/metrics */
export async function recordMetric(request: Request, ctx: ApiContext): Promise<Response> {
  const now = ctx.now();
  if (!ctx.ipLimiter.hit(`metrics:${clientIp(request)}`, LIMITS.metricsPerIp, now.getTime()).ok) {
    return new Response(null, { status: 204 });
  }
  const input = await readJson(request, 256);
  if (!isRecord(input) || !isMetricEvent(input.event)) return fail(400, "invalid_request");
  const day = now.toISOString().slice(0, 10);
  await ctx.db.execute(sql`
    INSERT INTO metrics_daily (day, event, count) VALUES (${day}, ${input.event}, 1)
    ON CONFLICT (day, event) DO UPDATE SET count = metrics_daily.count + 1
  `);
  return new Response(null, { status: 204 });
}

/** GET /api/metrics — the daily totals; aggregate only, nothing personal. */
export async function readMetrics(_request: Request, ctx: ApiContext): Promise<Response> {
  const result = await ctx.db.execute(sql`
    SELECT day::text AS day, event, count FROM metrics_daily ORDER BY day DESC, event LIMIT 500
  `);
  const rows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows;
  return json({ metrics: rows });
}

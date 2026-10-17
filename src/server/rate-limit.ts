/**
 * Rate limiting (AK-10). Limits by IP live only in this process's memory,
 * because Solace does not store IP addresses (PRD 13.1). Limits by username
 * are kept in the database so they hold across server instances.
 */

import { sql } from "drizzle-orm";
import type { Db } from "./db";

export interface LimitResult {
  ok: boolean;
  /** Seconds until the window resets, when blocked. */
  retryAfter: number;
}

export interface Limit {
  limit: number;
  windowMs: number;
}

export const LIMITS = {
  saltPerIp: { limit: 60, windowMs: 15 * 60_000 },
  registerPerIp: { limit: 10, windowMs: 60 * 60_000 },
  loginPerIp: { limit: 30, windowMs: 15 * 60_000 },
  loginPerUsername: { limit: 10, windowMs: 15 * 60_000 },
  recoverPerIp: { limit: 10, windowMs: 60 * 60_000 },
  recoverPerUsername: { limit: 5, windowMs: 60 * 60_000 },
  metricsPerIp: { limit: 120, windowMs: 60_000 },
} satisfies Record<string, Limit>;

export class MemoryLimiter {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  hit(key: string, { limit, windowMs }: Limit, now: number): LimitResult {
    if (this.windows.size > 10_000) this.prune(now);
    const current = this.windows.get(key);
    if (!current || current.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfter: 0 };
    }
    current.count += 1;
    const ok = current.count <= limit;
    return { ok, retryAfter: ok ? 0 : Math.ceil((current.resetAt - now) / 1000) };
  }

  private prune(now: number) {
    for (const [key, window] of this.windows) if (window.resetAt <= now) this.windows.delete(key);
  }
}

/** Fixed-window counter in the database, atomic per key. */
export async function hitDbLimit(db: Db, key: string, { limit, windowMs }: Limit, now: Date): Promise<LimitResult> {
  const windowStart = new Date(now.getTime() - windowMs).toISOString();
  const nowIso = now.toISOString();
  const result = await db.execute(sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, ${nowIso}, 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start <= ${windowStart} THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start <= ${windowStart} THEN ${nowIso}::timestamptz ELSE rate_limits.window_start END
    RETURNING count, window_start
  `);
  const rows = (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as {
    count: number;
    window_start: string | Date;
  }[];
  const row = rows[0];
  if (!row) return { ok: true, retryAfter: 0 };
  const ok = Number(row.count) <= limit;
  const resetAt = new Date(row.window_start).getTime() + windowMs;
  return { ok, retryAfter: ok ? 0 : Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)) };
}

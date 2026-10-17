/**
 * Sessions (AK-05, PRD 13.5): an HttpOnly, Secure, SameSite=Strict cookie
 * holding a random token; only its SHA-256 is stored. A session ends after
 * 30 minutes without activity, and every authenticated request extends it.
 */

import { and, eq, gt, lt } from "drizzle-orm";
import { newSessionToken, sessionIdFor } from "@/lib/crypto/server";
import type { Db } from "./db";
import { readCookie } from "./http";
import { sessions, users } from "./schema";

export const SESSION_COOKIE = "solace_session";
export const SESSION_IDLE_MS = 30 * 60_000;

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_IDLE_MS / 1000}`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/** Starts a session and returns the Set-Cookie value. */
export async function startSession(db: Db, userId: string, now: Date): Promise<string> {
  const { token, id } = newSessionToken();
  await db.insert(sessions).values({ id, userId, expiresAt: new Date(now.getTime() + SESSION_IDLE_MS) });
  // Expired sessions of anyone are cleaned up on the way.
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  return sessionCookie(token);
}

export interface Session {
  id: string;
  userId: string;
  username: string;
  /** Refreshed cookie to send back (sliding 30-minute expiry). */
  cookie: string;
}

/** The caller's live session, extended by 30 minutes; null when absent or expired. */
export async function currentSession(db: Db, request: Request, now: Date): Promise<Session | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const id = sessionIdFor(token);
  const [row] = await db
    .select({ userId: sessions.userId, username: users.username })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  await db
    .update(sessions)
    .set({ expiresAt: new Date(now.getTime() + SESSION_IDLE_MS) })
    .where(eq(sessions.id, id));
  return { id, userId: row.userId, username: row.username, cookie: sessionCookie(token) };
}

export async function endSession(db: Db, request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.id, sessionIdFor(token)));
}

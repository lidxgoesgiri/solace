/**
 * Encrypted records (P1): the server stores and returns nonce + ciphertext
 * and the record kind; it never sees answers, scores, plans, or notes.
 */

import { randomBytes } from "node:crypto";
import { and, asc, count, eq } from "drizzle-orm";
import type { ApiContext } from "../context";
import { fail, isRecord, json, readJson } from "../http";
import { records, users } from "../schema";
import { clearedSessionCookie, currentSession } from "../session";
import { MAX_CIPHERTEXT_CHARS, RECORD_ID_PATTERN, isCiphertext, isNonce, isRecordKind } from "../validate";

const MAX_BODY = MAX_CIPHERTEXT_CHARS + 1024;
/** Enough for years of screenings and daily check-ins. */
export const MAX_RECORDS_PER_USER = 2000;

function shape(row: typeof records.$inferSelect) {
  return {
    id: row.id,
    kind: row.kind,
    nonce: row.nonce,
    ciphertext: row.ciphertext,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** GET /api/records */
export async function listRecords(request: Request, ctx: ApiContext): Promise<Response> {
  const session = await currentSession(ctx.db, request, ctx.now());
  if (!session) return fail(401, "unauthorized", { "Set-Cookie": clearedSessionCookie() });
  const rows = await ctx.db
    .select()
    .from(records)
    .where(eq(records.userId, session.userId))
    .orderBy(asc(records.createdAt));
  return json({ records: rows.map(shape) }, { headers: { "Set-Cookie": session.cookie } });
}

/** POST /api/records */
export async function createRecord(request: Request, ctx: ApiContext): Promise<Response> {
  const session = await currentSession(ctx.db, request, ctx.now());
  if (!session) return fail(401, "unauthorized");
  const input = await readJson(request, MAX_BODY);
  if (input === undefined) return fail(413, "too_large");
  if (!isRecord(input) || !isRecordKind(input.kind) || !isNonce(input.nonce) || !isCiphertext(input.ciphertext)) {
    return fail(400, "invalid_request");
  }
  const [{ total } = { total: 0 }] = await ctx.db
    .select({ total: count() })
    .from(records)
    .where(eq(records.userId, session.userId));
  if (total >= MAX_RECORDS_PER_USER) return fail(413, "too_large");

  const now = ctx.now();
  const [row] = await ctx.db
    .insert(records)
    .values({
      id: randomBytes(16).toString("base64url"),
      userId: session.userId,
      kind: input.kind,
      nonce: input.nonce,
      ciphertext: input.ciphertext,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return json({ record: shape(row!) }, { status: 201, headers: { "Set-Cookie": session.cookie } });
}

/** PUT /api/records/:id */
export async function updateRecord(request: Request, ctx: ApiContext, id: string): Promise<Response> {
  const session = await currentSession(ctx.db, request, ctx.now());
  if (!session) return fail(401, "unauthorized");
  if (!RECORD_ID_PATTERN.test(id)) return fail(404, "not_found");
  const input = await readJson(request, MAX_BODY);
  if (input === undefined) return fail(413, "too_large");
  if (!isRecord(input) || !isNonce(input.nonce) || !isCiphertext(input.ciphertext)) {
    return fail(400, "invalid_request");
  }
  const [row] = await ctx.db
    .update(records)
    .set({ nonce: input.nonce, ciphertext: input.ciphertext, updatedAt: ctx.now() })
    .where(and(eq(records.id, id), eq(records.userId, session.userId)))
    .returning();
  if (!row) return fail(404, "not_found");
  return json({ record: shape(row) }, { headers: { "Set-Cookie": session.cookie } });
}

/** DELETE /api/records/:id */
export async function deleteRecord(request: Request, ctx: ApiContext, id: string): Promise<Response> {
  const session = await currentSession(ctx.db, request, ctx.now());
  if (!session) return fail(401, "unauthorized");
  if (!RECORD_ID_PATTERN.test(id)) return fail(404, "not_found");
  const deleted = await ctx.db
    .delete(records)
    .where(and(eq(records.id, id), eq(records.userId, session.userId)))
    .returning({ id: records.id });
  if (deleted.length === 0) return fail(404, "not_found");
  return json({ ok: true }, { headers: { "Set-Cookie": session.cookie } });
}

/**
 * DELETE /api/account (AK-09, P3). The user types their username to confirm;
 * the user row goes and every record and session goes with it (cascade).
 */
export async function deleteAccount(request: Request, ctx: ApiContext): Promise<Response> {
  const session = await currentSession(ctx.db, request, ctx.now());
  if (!session) return fail(401, "unauthorized");
  const input = await readJson(request, 1024);
  if (!isRecord(input) || typeof input.confirmUsername !== "string") return fail(400, "invalid_request");
  if (input.confirmUsername.normalize("NFKC").trim().toLowerCase() !== session.username) {
    return fail(400, "invalid_request");
  }
  await ctx.db.delete(users).where(eq(users.id, session.userId));
  return json({ ok: true }, { headers: { "Set-Cookie": clearedSessionCookie() } });
}

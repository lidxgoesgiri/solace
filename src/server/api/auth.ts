/**
 * Account API (AK-01–AK-07, AK-10). The browser does all key work; the
 * server checks an auth key against its own Argon2id hash and stores wrapped
 * keys it cannot open.
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { decoySalt, hashAuthKey, verifyAuthKey } from "@/lib/crypto/server";
import { DEFAULT_KDF } from "@/lib/crypto/keys";
import type { ApiContext } from "../context";
import { clientIp, fail, isRecord, json, readJson } from "../http";
import { LIMITS, hitDbLimit, type LimitResult } from "../rate-limit";
import { sessions, users } from "../schema";
import { clearedSessionCookie, currentSession, endSession, startSession } from "../session";
import { isAuthKey, isKdfParams, isSalt, isWrappedKey, normalizeUsername } from "../validate";

const MAX_BODY = 4 * 1024;

/** Verifying against this keeps unknown usernames as slow as known ones. */
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashAuthKey("A".repeat(43)));

function limited(result: LimitResult): Response | null {
  return result.ok ? null : fail(429, "rate_limited", { "Retry-After": String(result.retryAfter) });
}

async function body(request: Request): Promise<Record<string, unknown> | Response> {
  const parsed = await readJson(request, MAX_BODY);
  if (parsed === undefined) return fail(413, "too_large");
  if (!isRecord(parsed)) return fail(400, "invalid_request");
  return parsed;
}

/** POST /api/auth/salt — the KDF salt and cost for a username (decoy if unknown). */
export async function salt(request: Request, ctx: ApiContext): Promise<Response> {
  const block = limited(ctx.ipLimiter.hit(`salt:${clientIp(request)}`, LIMITS.saltPerIp, ctx.now().getTime()));
  if (block) return block;
  const input = await body(request);
  if (input instanceof Response) return input;
  const username = normalizeUsername(input.username);
  if (!username) return fail(400, "invalid_request");
  const [user] = await ctx.db
    .select({ salt: users.kdfSalt, kdfParams: users.kdfParams })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return json(user ?? { salt: decoySalt(ctx.secret, username), kdfParams: DEFAULT_KDF });
}

/** POST /api/auth/register (AK-01, AK-02). */
export async function register(request: Request, ctx: ApiContext): Promise<Response> {
  const block = limited(ctx.ipLimiter.hit(`register:${clientIp(request)}`, LIMITS.registerPerIp, ctx.now().getTime()));
  if (block) return block;
  const input = await body(request);
  if (input instanceof Response) return input;

  const username = normalizeUsername(input.username);
  const { authKey, salt: kdfSalt, kdfParams, wrappedKeyPassphrase, wrappedKeyRecovery, recoveryAuthKey } = input;
  if (
    !username ||
    !isAuthKey(authKey) ||
    !isSalt(kdfSalt) ||
    !isKdfParams(kdfParams) ||
    !isWrappedKey(wrappedKeyPassphrase) ||
    !isWrappedKey(wrappedKeyRecovery) ||
    !isAuthKey(recoveryAuthKey)
  ) {
    return fail(400, "invalid_request");
  }

  const [existing] = await ctx.db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existing) return fail(409, "username_taken");

  const id = randomUUID();
  const [authHash, recoveryAuthHash] = await Promise.all([hashAuthKey(authKey), hashAuthKey(recoveryAuthKey)]);
  try {
    await ctx.db.insert(users).values({
      id,
      username,
      authHash,
      kdfSalt,
      kdfParams,
      wrappedKeyPassphrase,
      wrappedKeyRecovery,
      recoveryAuthHash,
    });
  } catch {
    // Unique constraint: someone took the name in the meantime.
    return fail(409, "username_taken");
  }
  const cookie = await startSession(ctx.db, id, ctx.now());
  return json({ username }, { status: 201, headers: { "Set-Cookie": cookie } });
}

/** POST /api/auth/login (AK-05). Returns the passphrase-wrapped data key. */
export async function login(request: Request, ctx: ApiContext): Promise<Response> {
  const now = ctx.now();
  const block = limited(ctx.ipLimiter.hit(`login:${clientIp(request)}`, LIMITS.loginPerIp, now.getTime()));
  if (block) return block;
  const input = await body(request);
  if (input instanceof Response) return input;
  const username = normalizeUsername(input.username);
  if (!username || !isAuthKey(input.authKey)) return fail(400, "invalid_request");

  const userBlock = limited(await hitDbLimit(ctx.db, `login:${username}`, LIMITS.loginPerUsername, now));
  if (userBlock) return userBlock;

  const [user] = await ctx.db.select().from(users).where(eq(users.username, username)).limit(1);
  const valid = await verifyAuthKey(input.authKey, user?.authHash ?? (await getDummyHash()));
  if (!user || !valid) return fail(401, "invalid_credentials");

  const cookie = await startSession(ctx.db, user.id, now);
  return json(
    { username: user.username, wrappedKeyPassphrase: user.wrappedKeyPassphrase },
    { headers: { "Set-Cookie": cookie } },
  );
}

/** POST /api/auth/logout */
export async function logout(request: Request, ctx: ApiContext): Promise<Response> {
  await endSession(ctx.db, request);
  return json({ ok: true }, { headers: { "Set-Cookie": clearedSessionCookie() } });
}

/** GET /api/auth/session — who is signed in (the data key still needs the passphrase). */
export async function session(request: Request, ctx: ApiContext): Promise<Response> {
  const current = await currentSession(ctx.db, request, ctx.now());
  if (!current) return fail(401, "unauthorized", { "Set-Cookie": clearedSessionCookie() });
  return json({ username: current.username }, { headers: { "Set-Cookie": current.cookie } });
}

async function checkRecovery(
  request: Request,
  ctx: ApiContext,
  input: Record<string, unknown>,
): Promise<typeof users.$inferSelect | Response> {
  const now = ctx.now();
  const block = limited(ctx.ipLimiter.hit(`recover:${clientIp(request)}`, LIMITS.recoverPerIp, now.getTime()));
  if (block) return block;
  const username = normalizeUsername(input.username);
  if (!username || !isAuthKey(input.recoveryAuthKey)) return fail(400, "invalid_request");
  const userBlock = limited(await hitDbLimit(ctx.db, `recover:${username}`, LIMITS.recoverPerUsername, now));
  if (userBlock) return userBlock;
  const [user] = await ctx.db.select().from(users).where(eq(users.username, username)).limit(1);
  const valid = await verifyAuthKey(input.recoveryAuthKey, user?.recoveryAuthHash ?? (await getDummyHash()));
  if (!user || !valid) return fail(401, "invalid_credentials");
  return user;
}

/** POST /api/auth/recover/start (AK-06) — the recovery-wrapped data key. */
export async function recoverStart(request: Request, ctx: ApiContext): Promise<Response> {
  const input = await body(request);
  if (input instanceof Response) return input;
  const user = await checkRecovery(request, ctx, input);
  if (user instanceof Response) return user;
  return json({ wrappedKeyRecovery: user.wrappedKeyRecovery });
}

/** POST /api/auth/recover/finish (AK-06) — a new passphrase; every old session ends. */
export async function recoverFinish(request: Request, ctx: ApiContext): Promise<Response> {
  const input = await body(request);
  if (input instanceof Response) return input;
  const { authKey, salt: kdfSalt, kdfParams, wrappedKeyPassphrase } = input;
  if (!isAuthKey(authKey) || !isSalt(kdfSalt) || !isKdfParams(kdfParams) || !isWrappedKey(wrappedKeyPassphrase)) {
    return fail(400, "invalid_request");
  }
  const user = await checkRecovery(request, ctx, input);
  if (user instanceof Response) return user;
  await ctx.db
    .update(users)
    .set({ authHash: await hashAuthKey(authKey), kdfSalt, kdfParams, wrappedKeyPassphrase })
    .where(eq(users.id, user.id));
  await ctx.db.delete(sessions).where(eq(sessions.userId, user.id));
  const cookie = await startSession(ctx.db, user.id, ctx.now());
  return json({ username: user.username }, { headers: { "Set-Cookie": cookie } });
}

/** POST /api/auth/passphrase (AK-07) — re-wraps the data key; records stay as they are. */
export async function changePassphrase(request: Request, ctx: ApiContext): Promise<Response> {
  const current = await currentSession(ctx.db, request, ctx.now());
  if (!current) return fail(401, "unauthorized");
  const input = await body(request);
  if (input instanceof Response) return input;
  const { currentAuthKey, authKey, salt: kdfSalt, kdfParams, wrappedKeyPassphrase } = input;
  if (
    !isAuthKey(currentAuthKey) ||
    !isAuthKey(authKey) ||
    !isSalt(kdfSalt) ||
    !isKdfParams(kdfParams) ||
    !isWrappedKey(wrappedKeyPassphrase)
  ) {
    return fail(400, "invalid_request");
  }
  const [user] = await ctx.db.select().from(users).where(eq(users.id, current.userId)).limit(1);
  if (!user || !(await verifyAuthKey(currentAuthKey, user.authHash))) return fail(401, "invalid_credentials");
  await ctx.db
    .update(users)
    .set({ authHash: await hashAuthKey(authKey), kdfSalt, kdfParams, wrappedKeyPassphrase })
    .where(eq(users.id, user.id));
  return json({ ok: true }, { headers: { "Set-Cookie": current.cookie } });
}

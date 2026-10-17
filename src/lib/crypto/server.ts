/**
 * Server-side crypto (Node only): hashing what the browser sends as its auth
 * key, session tokens, and decoy salts. The server never sees a passphrase,
 * a recovery key, or a data key (PRD 13.1, 13.2).
 */

import {
  argon2 as argon2Callback,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const argon2 = promisify(argon2Callback);

/** OWASP's minimum for Argon2id: 19 MiB, 2 passes. Input is already a 256-bit key. */
const HASH_PARAMS = { memory: 19_456, passes: 2, parallelism: 1, tagLength: 32 } as const;

/** PHC string: $argon2id$v=19$m=…,t=…,p=…$salt$hash (base64, no padding). */
export async function hashAuthKey(authKey: string): Promise<string> {
  const nonce = randomBytes(16);
  const hash = await argon2("argon2id", { message: authKey, nonce, ...HASH_PARAMS });
  const { memory: m, passes: t, parallelism: p } = HASH_PARAMS;
  return `$argon2id$v=19$m=${m},t=${t},p=${p}$${nonce.toString("base64url")}$${hash.toString("base64url")}`;
}

const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;

export async function verifyAuthKey(authKey: string, stored: string): Promise<boolean> {
  const match = PHC.exec(stored);
  if (!match) return false;
  const [, m, t, p, salt, expected] = match;
  const expectedBytes = Buffer.from(expected!, "base64url");
  const hash = await argon2("argon2id", {
    message: authKey,
    nonce: Buffer.from(salt!, "base64url"),
    memory: Number(m),
    passes: Number(t),
    parallelism: Number(p),
    tagLength: expectedBytes.length,
  });
  return hash.length === expectedBytes.length && timingSafeEqual(hash, expectedBytes);
}

/** A random session token for the cookie, and the id stored for it. */
export function newSessionToken(): { token: string; id: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, id: sessionIdFor(token) };
}

/** Only a hash of the token is stored, so a database leak cannot replay sessions. */
export function sessionIdFor(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * A stable salt for a username that does not exist, so the salt endpoint
 * does not reveal which usernames are taken.
 */
export function decoySalt(secret: string, username: string): string {
  return createHmac("sha256", secret).update(`salt:${username}`).digest().subarray(0, 16).toString("base64url");
}

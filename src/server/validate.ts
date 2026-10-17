/** Input validation for the account API (PRD 13.5). Everything is untrusted. */

import { isBase64Url } from "@/lib/crypto/encoding";
import {
  KEY_BYTES,
  SALT_BYTES,
  WRAPPED_KEY_BYTES,
  type KdfParams,
} from "@/lib/crypto/keys";
import { isRecord } from "./http";
import { RECORD_KINDS, type RecordKind } from "./schema";

/** 3–32 characters: lower-case letters, digits, dot, dash, underscore. No email. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.normalize("NFKC").trim().toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
}

export function isAuthKey(value: unknown): value is string {
  return isBase64Url(value, KEY_BYTES);
}

export function isSalt(value: unknown): value is string {
  return isBase64Url(value, SALT_BYTES);
}

export function isWrappedKey(value: unknown): value is string {
  return isBase64Url(value, WRAPPED_KEY_BYTES);
}

const MIB = 1024 * 1024;

export function isKdfParams(value: unknown): value is KdfParams {
  if (!isRecord(value)) return false;
  return (
    value.alg === "argon2id13" &&
    Number.isInteger(value.opslimit) &&
    (value.opslimit as number) >= 1 &&
    (value.opslimit as number) <= 10 &&
    Number.isInteger(value.memlimit) &&
    (value.memlimit as number) >= 8 * MIB &&
    (value.memlimit as number) <= 1024 * MIB
  );
}

export function isRecordKind(value: unknown): value is RecordKind {
  return RECORD_KINDS.includes(value as RecordKind);
}

/** 24-byte XChaCha20 nonce. */
export function isNonce(value: unknown): value is string {
  return isBase64Url(value, 24);
}

/** Ciphertext of one record: at most 192 KB once decoded (PRD 13.5). */
export const MAX_CIPHERTEXT_CHARS = 256 * 1024;

export function isCiphertext(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_CIPHERTEXT_CHARS && isBase64Url(value);
}

export const RECORD_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

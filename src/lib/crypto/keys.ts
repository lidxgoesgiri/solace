/**
 * End-to-end encryption for Solace accounts (PRD 13.2), run in the browser.
 *
 * 1. A random 256-bit data key encrypts every record (XChaCha20-Poly1305).
 * 2. Passphrase + per-user salt → Argon2id → master key, from which two
 *    separate keys are derived: the auth key (sent to the server, which
 *    hashes it again) and the wrapping key (never leaves the browser).
 * 3. The data key is wrapped twice: by the wrapping key and by a random
 *    recovery key that the user keeps as a recovery kit.
 * 4. Changing the passphrase re-wraps the data key; records stay as they are.
 *
 * Only libsodium's high-level primitives are used. The library (about
 * 300 KB) is loaded on demand, never with a page.
 */

import type sodiumType from "libsodium-wrappers-sumo";
import { fromRecoveryCode, toRecoveryCode } from "./encoding";

type Sodium = typeof sodiumType;

let sodiumPromise: Promise<Sodium> | null = null;

/** Loads libsodium once. */
export function loadSodium(): Promise<Sodium> {
  sodiumPromise ??= import("libsodium-wrappers-sumo").then(async (module) => {
    const sodium = (module.default ?? module) as Sodium;
    await sodium.ready;
    return sodium;
  });
  return sodiumPromise;
}

export interface KdfParams {
  alg: "argon2id13";
  opslimit: number;
  /** Bytes. */
  memlimit: number;
}

/** libsodium's "interactive" Argon2id cost: 2 passes, 64 MiB. Phones handle it. */
export const DEFAULT_KDF: KdfParams = { alg: "argon2id13", opslimit: 2, memlimit: 64 * 1024 * 1024 };

export const KEY_BYTES = 32;
export const SALT_BYTES = 16;
/** 24-byte nonce + 32-byte key + 16-byte tag. */
export const WRAPPED_KEY_BYTES = 72;
export const RECOVERY_KEY_BYTES = 32;

const KDF_CONTEXT = "solaceky";
const RECOVERY_CONTEXT = "solacerc";
const AUTH_SUBKEY = 1;
const WRAP_SUBKEY = 2;
const DATA_KEY_AD = "solace:data-key:v1";

export class WrongKeyError extends Error {
  constructor() {
    super("The passphrase or recovery key does not open this account");
    this.name = "WrongKeyError";
  }
}

function b64(sodium: Sodium, bytes: Uint8Array): string {
  return sodium.to_base64(bytes, sodium.base64_variants.URLSAFE_NO_PADDING);
}

function fromB64(sodium: Sodium, value: string): Uint8Array {
  return sodium.from_base64(value, sodium.base64_variants.URLSAFE_NO_PADDING);
}

interface KeyPair {
  /** base64url; what the server sees (and hashes again). */
  authKey: string;
  /** Never leaves the browser. */
  wrapKey: Uint8Array;
}

function splitMasterKey(sodium: Sodium, master: Uint8Array, context: string): KeyPair {
  const auth = sodium.crypto_kdf_derive_from_key(KEY_BYTES, AUTH_SUBKEY, context, master);
  const wrap = sodium.crypto_kdf_derive_from_key(KEY_BYTES, WRAP_SUBKEY, context, master);
  return { authKey: b64(sodium, auth), wrapKey: wrap };
}

/** Passphrase → auth key + wrapping key. The passphrase is NFKC-normalised. */
export async function deriveFromPassphrase(
  passphrase: string,
  salt: string,
  params: KdfParams,
): Promise<KeyPair> {
  const sodium = await loadSodium();
  const master = sodium.crypto_pwhash(
    KEY_BYTES,
    passphrase.normalize("NFKC"),
    fromB64(sodium, salt),
    params.opslimit,
    params.memlimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
  return splitMasterKey(sodium, master, KDF_CONTEXT);
}

/** Recovery code (as shown to the user) → auth key + wrapping key. */
export async function deriveFromRecoveryCode(code: string): Promise<KeyPair> {
  const sodium = await loadSodium();
  const key = fromRecoveryCode(code, RECOVERY_KEY_BYTES);
  if (!key) throw new WrongKeyError();
  return splitMasterKey(sodium, key, RECOVERY_CONTEXT);
}

function wrap(sodium: Sodium, dataKey: Uint8Array, wrapKey: Uint8Array): string {
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const sealed = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(dataKey, DATA_KEY_AD, null, nonce, wrapKey);
  const out = new Uint8Array(nonce.length + sealed.length);
  out.set(nonce);
  out.set(sealed, nonce.length);
  return b64(sodium, out);
}

function unwrap(sodium: Sodium, wrapped: string, wrapKey: Uint8Array): Uint8Array {
  const bytes = fromB64(sodium, wrapped);
  const nonceBytes = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  try {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      bytes.slice(nonceBytes),
      DATA_KEY_AD,
      bytes.slice(0, nonceBytes),
      wrapKey,
    );
  } catch {
    throw new WrongKeyError();
  }
}

export interface PassphraseKeys {
  salt: string;
  kdfParams: KdfParams;
  authKey: string;
  wrappedKeyPassphrase: string;
}

export interface NewAccountKeys extends PassphraseKeys {
  dataKey: Uint8Array;
  wrappedKeyRecovery: string;
  recoveryAuthKey: string;
  /** Shown once to the user (AK-02). Crockford base32 in groups of four. */
  recoveryCode: string;
}

/** Wraps an existing data key for a (new) passphrase (AK-07, recovery). */
export async function wrapForPassphrase(
  dataKey: Uint8Array,
  passphrase: string,
  params: KdfParams = DEFAULT_KDF,
): Promise<PassphraseKeys> {
  const sodium = await loadSodium();
  const salt = b64(sodium, sodium.randombytes_buf(SALT_BYTES));
  const { authKey, wrapKey } = await deriveFromPassphrase(passphrase, salt, params);
  return { salt, kdfParams: params, authKey, wrappedKeyPassphrase: wrap(sodium, dataKey, wrapKey) };
}

/** Everything a new account needs (AK-01, AK-02). */
export async function createAccountKeys(
  passphrase: string,
  params: KdfParams = DEFAULT_KDF,
): Promise<NewAccountKeys> {
  const sodium = await loadSodium();
  const dataKey = sodium.randombytes_buf(KEY_BYTES);
  const recoveryKey = sodium.randombytes_buf(RECOVERY_KEY_BYTES);
  const recoveryCode = toRecoveryCode(recoveryKey);
  const recovery = splitMasterKey(sodium, recoveryKey, RECOVERY_CONTEXT);
  const passphraseKeys = await wrapForPassphrase(dataKey, passphrase, params);
  return {
    ...passphraseKeys,
    dataKey,
    wrappedKeyRecovery: wrap(sodium, dataKey, recovery.wrapKey),
    recoveryAuthKey: recovery.authKey,
    recoveryCode,
  };
}

/** Opens the data key with a wrapping key; throws WrongKeyError otherwise. */
export async function unwrapDataKey(wrapped: string, wrapKey: Uint8Array): Promise<Uint8Array> {
  const sodium = await loadSodium();
  return unwrap(sodium, wrapped, wrapKey);
}

export interface SealedRecord {
  nonce: string;
  ciphertext: string;
}

/** The record kind is bound to the ciphertext, so records cannot be swapped. */
function recordAd(kind: string): string {
  return `solace:record:${kind}:v1`;
}

export async function encryptRecord(dataKey: Uint8Array, kind: string, value: unknown): Promise<SealedRecord> {
  const sodium = await loadSodium();
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const plaintext = sodium.from_string(JSON.stringify(value));
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, recordAd(kind), null, nonce, dataKey);
  return { nonce: b64(sodium, nonce), ciphertext: b64(sodium, ciphertext) };
}

export async function decryptRecord<T>(dataKey: Uint8Array, kind: string, sealed: SealedRecord): Promise<T> {
  const sodium = await loadSodium();
  try {
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      fromB64(sodium, sealed.ciphertext),
      recordAd(kind),
      fromB64(sodium, sealed.nonce),
      dataKey,
    );
    return JSON.parse(sodium.to_string(plaintext)) as T;
  } catch {
    throw new WrongKeyError();
  }
}

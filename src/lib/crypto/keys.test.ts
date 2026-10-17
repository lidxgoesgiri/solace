import { describe, expect, it } from "vitest";
import { fromRecoveryCode, isBase64Url, toRecoveryCode } from "./encoding";
import {
  DEFAULT_KDF,
  KEY_BYTES,
  RECOVERY_KEY_BYTES,
  SALT_BYTES,
  WRAPPED_KEY_BYTES,
  WrongKeyError,
  createAccountKeys,
  decryptRecord,
  deriveFromPassphrase,
  deriveFromRecoveryCode,
  encryptRecord,
  unwrapDataKey,
  wrapForPassphrase,
  type KdfParams,
} from "./keys";

// The cheapest Argon2id cost libsodium allows keeps the suite fast; the
// default cost is checked separately.
const FAST: KdfParams = { alg: "argon2id13", opslimit: 1, memlimit: 8 * 1024 * 1024 };
const PASSPHRASE = "kopi susu di perpustakaan pagi";

describe("recovery code encoding", () => {
  it("round-trips 32 random bytes", () => {
    const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_KEY_BYTES));
    const code = toRecoveryCode(bytes);
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){12}[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(fromRecoveryCode(code, RECOVERY_KEY_BYTES)).toEqual(bytes);
  });

  it("forgives case, spaces, dashes, and look-alike letters", () => {
    const bytes = new Uint8Array(RECOVERY_KEY_BYTES).map((_, i) => (i * 37) % 256);
    const code = toRecoveryCode(bytes);
    const typed = code.toLowerCase().replace(/-/g, " ").replace(/1/g, "l").replace(/0/g, "o");
    expect(fromRecoveryCode(typed, RECOVERY_KEY_BYTES)).toEqual(bytes);
  });

  it("rejects codes of the wrong length or with foreign characters", () => {
    expect(fromRecoveryCode("ABCD-EFGH", RECOVERY_KEY_BYTES)).toBeNull();
    const code = toRecoveryCode(new Uint8Array(RECOVERY_KEY_BYTES));
    expect(fromRecoveryCode(`${code.slice(0, -1)}U`, RECOVERY_KEY_BYTES)).toBeNull();
  });
});

describe("account keys (PRD 13.2)", () => {
  it("creates keys in the sizes the server expects", async () => {
    const keys = await createAccountKeys(PASSPHRASE, FAST);
    expect(keys.dataKey).toHaveLength(KEY_BYTES);
    expect(isBase64Url(keys.salt, SALT_BYTES)).toBe(true);
    expect(isBase64Url(keys.authKey, KEY_BYTES)).toBe(true);
    expect(isBase64Url(keys.recoveryAuthKey, KEY_BYTES)).toBe(true);
    expect(isBase64Url(keys.wrappedKeyPassphrase, WRAPPED_KEY_BYTES)).toBe(true);
    expect(isBase64Url(keys.wrappedKeyRecovery, WRAPPED_KEY_BYTES)).toBe(true);
    expect(keys.authKey).not.toBe(keys.recoveryAuthKey);
  });

  it("the passphrase opens the data key; the auth key alone cannot", async () => {
    const keys = await createAccountKeys(PASSPHRASE, FAST);
    const derived = await deriveFromPassphrase(PASSPHRASE, keys.salt, keys.kdfParams);
    expect(derived.authKey).toBe(keys.authKey);
    expect(await unwrapDataKey(keys.wrappedKeyPassphrase, derived.wrapKey)).toEqual(keys.dataKey);
    // The server knows the auth key; it must not be the wrapping key.
    expect(Buffer.from(derived.wrapKey).toString("base64url")).not.toBe(keys.authKey);
  });

  it("a wrong passphrase fails without revealing anything", async () => {
    const keys = await createAccountKeys(PASSPHRASE, FAST);
    const wrong = await deriveFromPassphrase(`${PASSPHRASE}!`, keys.salt, keys.kdfParams);
    expect(wrong.authKey).not.toBe(keys.authKey);
    await expect(unwrapDataKey(keys.wrappedKeyPassphrase, wrong.wrapKey)).rejects.toBeInstanceOf(WrongKeyError);
  });

  it("normalises the passphrase (NFKC), so the same words always match", async () => {
    const keys = await createAccountKeys("café latte sore hari", FAST);
    const decomposed = "café latte sore hari";
    expect(decomposed).not.toBe("café latte sore hari");
    const derived = await deriveFromPassphrase(decomposed, keys.salt, keys.kdfParams);
    expect(derived.authKey).toBe(keys.authKey);
  });

  it("P4: the recovery code opens the same data key", async () => {
    const keys = await createAccountKeys(PASSPHRASE, FAST);
    const recovery = await deriveFromRecoveryCode(keys.recoveryCode);
    expect(recovery.authKey).toBe(keys.recoveryAuthKey);
    expect(await unwrapDataKey(keys.wrappedKeyRecovery, recovery.wrapKey)).toEqual(keys.dataKey);
    await expect(deriveFromRecoveryCode("not a code")).rejects.toBeInstanceOf(WrongKeyError);
  });

  it("AK-07: a new passphrase re-wraps the same data key; old records still open", async () => {
    const keys = await createAccountKeys(PASSPHRASE, FAST);
    const sealed = await encryptRecord(keys.dataKey, "screening", { answers: [1, 2, 3] });
    const next = await wrapForPassphrase(keys.dataKey, "a completely new passphrase", FAST);
    expect(next.salt).not.toBe(keys.salt);
    const derived = await deriveFromPassphrase("a completely new passphrase", next.salt, FAST);
    const dataKey = await unwrapDataKey(next.wrappedKeyPassphrase, derived.wrapKey);
    expect(await decryptRecord(dataKey, "screening", sealed)).toEqual({ answers: [1, 2, 3] });
  });

  it("uses libsodium's interactive Argon2id cost by default", () => {
    expect(DEFAULT_KDF).toEqual({ alg: "argon2id13", opslimit: 2, memlimit: 64 * 1024 * 1024 });
  });
});

describe("records (P1)", () => {
  it("round-trips a record and hides its contents", async () => {
    const { dataKey } = await createAccountKeys(PASSPHRASE, FAST);
    const value = { answers: [3, 3, 3], safetyAnswer: 2, note: "sulit tidur" };
    const sealed = await encryptRecord(dataKey, "screening", value);
    expect(sealed.ciphertext).not.toContain("sulit");
    expect(Buffer.from(sealed.ciphertext, "base64url").toString("utf8")).not.toContain("sulit");
    expect(await decryptRecord(dataKey, "screening", sealed)).toEqual(value);
  });

  it("a fresh nonce every time", async () => {
    const { dataKey } = await createAccountKeys(PASSPHRASE, FAST);
    const a = await encryptRecord(dataKey, "checkin", { mood: 3 });
    const b = await encryptRecord(dataKey, "checkin", { mood: 3 });
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("rejects tampering, the wrong key, and a swapped record kind", async () => {
    const { dataKey } = await createAccountKeys(PASSPHRASE, FAST);
    const other = await createAccountKeys(PASSPHRASE, FAST);
    const sealed = await encryptRecord(dataKey, "safety_plan", { steps: ["walk"] });
    const tampered = { ...sealed, ciphertext: `${sealed.ciphertext.slice(0, -2)}AA` };
    await expect(decryptRecord(dataKey, "safety_plan", tampered)).rejects.toBeInstanceOf(WrongKeyError);
    await expect(decryptRecord(other.dataKey, "safety_plan", sealed)).rejects.toBeInstanceOf(WrongKeyError);
    await expect(decryptRecord(dataKey, "checkin", sealed)).rejects.toBeInstanceOf(WrongKeyError);
  });
});

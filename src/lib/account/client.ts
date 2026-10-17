/**
 * Browser-side account operations: talks to /api, does all key work with
 * src/lib/crypto, and keeps the decrypted state in the in-memory account
 * store. Plaintext never leaves the browser (P1).
 */

import {
  createAccountKeys,
  decryptRecord,
  deriveFromPassphrase,
  deriveFromRecoveryCode,
  encryptRecord,
  unwrapDataKey,
  wrapForPassphrase,
  WrongKeyError,
  type KdfParams,
  type SealedRecord,
} from "@/lib/crypto/keys";
import { isAccountOpen, lockAccount, touchAccount, useAccountStore } from "@/store/account-store";
import type { RecordKind, RecordTypes, ScreeningRecord, StoredRecord } from "./types";

export type AccountErrorCode =
  | "invalid_request"
  | "username_taken"
  | "invalid_credentials"
  | "rate_limited"
  | "unauthorized"
  | "accounts_disabled"
  | "network"
  | "locked"
  | "unknown";

export class AccountError extends Error {
  constructor(readonly code: AccountErrorCode) {
    super(code);
    this.name = "AccountError";
  }
}

const KNOWN: AccountErrorCode[] = [
  "invalid_request",
  "username_taken",
  "invalid_credentials",
  "rate_limited",
  "unauthorized",
  "accounts_disabled",
];

async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AccountError("network");
  }
  if (response.status === 401 && path.startsWith("/api/records")) {
    // The server session ended (idle): close the account here too.
    lockAccount();
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    const code = KNOWN.find((known) => known === payload?.error) ?? "unknown";
    throw new AccountError(code);
  }
  return (response.status === 204 ? null : await response.json()) as T;
}

function open(username: string, dataKey: Uint8Array) {
  useAccountStore.setState({ username, dataKey, records: null, lastActivity: Date.now() });
}

function requireKey(): Uint8Array {
  if (!isAccountOpen()) throw new AccountError("locked");
  touchAccount();
  return useAccountStore.getState().dataKey!;
}

/**
 * AK-01, AK-02, AK-04: creates the account, opens it, and imports the
 * device's last finished screening. Returns the recovery code to show once.
 */
export async function registerAccount(
  username: string,
  passphrase: string,
  lastScreening: ScreeningRecord | null,
): Promise<{ recoveryCode: string; imported: boolean }> {
  const keys = await createAccountKeys(passphrase);
  const created = await api<{ username: string }>("/api/auth/register", {
    body: {
      username,
      authKey: keys.authKey,
      salt: keys.salt,
      kdfParams: keys.kdfParams,
      wrappedKeyPassphrase: keys.wrappedKeyPassphrase,
      wrappedKeyRecovery: keys.wrappedKeyRecovery,
      recoveryAuthKey: keys.recoveryAuthKey,
    },
  });
  open(created.username, keys.dataKey);
  let imported = false;
  if (lastScreening) {
    try {
      await saveRecord("screening", lastScreening);
      imported = true;
    } catch {
      // The account exists either way; the result can be saved again later.
    }
  }
  return { recoveryCode: keys.recoveryCode, imported };
}

/** AK-05: the passphrase never leaves the browser; only the derived auth key does. */
export async function signIn(username: string, passphrase: string): Promise<void> {
  const { salt, kdfParams } = await api<{ salt: string; kdfParams: KdfParams }>("/api/auth/salt", {
    body: { username },
  });
  const derived = await deriveFromPassphrase(passphrase, salt, kdfParams);
  const result = await api<{ username: string; wrappedKeyPassphrase: string }>("/api/auth/login", {
    body: { username, authKey: derived.authKey },
  });
  try {
    open(result.username, await unwrapDataKey(result.wrappedKeyPassphrase, derived.wrapKey));
  } catch (error) {
    if (error instanceof WrongKeyError) throw new AccountError("invalid_credentials");
    throw error;
  }
}

export async function signOut(): Promise<void> {
  lockAccount();
  await api("/api/auth/logout", { body: {} }).catch(() => undefined);
}

/** AK-06: recovery code + new passphrase restore access to the same data. */
export async function recoverAccount(
  username: string,
  recoveryCode: string,
  newPassphrase: string,
): Promise<void> {
  let recovery: Awaited<ReturnType<typeof deriveFromRecoveryCode>>;
  try {
    recovery = await deriveFromRecoveryCode(recoveryCode);
  } catch {
    throw new AccountError("invalid_credentials");
  }
  const { wrappedKeyRecovery } = await api<{ wrappedKeyRecovery: string }>(
    "/api/auth/recover/start",
    {
      body: { username, recoveryAuthKey: recovery.authKey },
    },
  );
  let dataKey: Uint8Array;
  try {
    dataKey = await unwrapDataKey(wrappedKeyRecovery, recovery.wrapKey);
  } catch {
    throw new AccountError("invalid_credentials");
  }
  const next = await wrapForPassphrase(dataKey, newPassphrase);
  const result = await api<{ username: string }>("/api/auth/recover/finish", {
    body: { username, recoveryAuthKey: recovery.authKey, ...next },
  });
  open(result.username, dataKey);
}

/** AK-07: re-wraps the data key; records are not touched. */
export async function changePassphrase(
  currentPassphrase: string,
  newPassphrase: string,
): Promise<void> {
  const dataKey = requireKey();
  const username = useAccountStore.getState().username!;
  const { salt, kdfParams } = await api<{ salt: string; kdfParams: KdfParams }>("/api/auth/salt", {
    body: { username },
  });
  const current = await deriveFromPassphrase(currentPassphrase, salt, kdfParams);
  const next = await wrapForPassphrase(dataKey, newPassphrase);
  await api("/api/auth/passphrase", { body: { currentAuthKey: current.authKey, ...next } });
}

/** AK-09: removes the account and everything in it. */
export async function deleteAccount(confirmUsername: string): Promise<void> {
  requireKey();
  await api("/api/account", { method: "DELETE", body: { confirmUsername } });
  lockAccount();
}

interface ServerRecord extends SealedRecord {
  id: string;
  kind: RecordKind;
  createdAt: string;
  updatedAt: string;
}

let recordsInFlight: Promise<StoredRecord[]> | null = null;

/** Loads and decrypts every record once per sign-in (or again with `force`). */
export async function loadRecords(force = false): Promise<StoredRecord[]> {
  const dataKey = requireKey();
  const cached = useAccountStore.getState().records;
  if (cached && !force) return cached;
  if (recordsInFlight && !force) return recordsInFlight;
  const run = (async () => {
    const { records } = await api<{ records: ServerRecord[] }>("/api/records");
    const decrypted: StoredRecord[] = [];
    for (const record of records) {
      try {
        decrypted.push({
          id: record.id,
          kind: record.kind,
          value: await decryptRecord(dataKey, record.kind, record),
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        } as StoredRecord);
      } catch {
        // A record that does not open is skipped rather than breaking the page.
      }
    }
    // Only keep them if the same account is still open.
    if (useAccountStore.getState().dataKey === dataKey)
      useAccountStore.setState({ records: decrypted });
    return decrypted;
  })().finally(() => {
    recordsInFlight = null;
  });
  recordsInFlight = run;
  return run;
}

/** Creates a record, or replaces the one with `id`. */
export async function saveRecord<K extends RecordKind>(
  kind: K,
  value: RecordTypes[K],
  id?: string,
): Promise<StoredRecord<K>> {
  const dataKey = requireKey();
  const sealed = await encryptRecord(dataKey, kind, value);
  const { record } = await api<{ record: ServerRecord }>(
    id ? `/api/records/${id}` : "/api/records",
    {
      method: id ? "PUT" : "POST",
      body: id ? sealed : { kind, ...sealed },
    },
  );
  const stored: StoredRecord<K> = {
    id: record.id,
    kind,
    value,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
  const records = useAccountStore.getState().records;
  if (records) {
    useAccountStore.setState({
      records: id
        ? records.map((existing) => (existing.id === id ? stored : existing))
        : [...records, stored],
    });
  }
  return stored;
}

export async function removeRecord(id: string): Promise<void> {
  requireKey();
  await api(`/api/records/${id}`, { method: "DELETE" });
  const records = useAccountStore.getState().records;
  if (records) useAccountStore.setState({ records: records.filter((record) => record.id !== id) });
}

// Saves in flight, keyed by completion time: two effects (or two tabs of the
// same page) asking at once must still produce one record.
const pendingScreenings = new Map<string, Promise<boolean>>();

/** Saves a finished screening unless the account already has it (same completion time). */
export function saveScreeningIfNew(screening: ScreeningRecord): Promise<boolean> {
  const key = screening.completedAt;
  const pending = pendingScreenings.get(key);
  if (pending) return pending;
  const run = (async () => {
    const records = await loadRecords();
    const exists = records.some(
      (record) =>
        record.kind === "screening" &&
        (record.value as ScreeningRecord).completedAt === screening.completedAt,
    );
    if (exists) return false;
    await saveRecord("screening", screening);
    return true;
  })().finally(() => pendingScreenings.delete(key));
  pendingScreenings.set(key, run);
  return run;
}

/** AK-08: every record, decrypted, as one JSON document. */
export async function exportAccount(): Promise<string> {
  const records = await loadRecords(true);
  return JSON.stringify(
    {
      app: "Solace",
      exportedAt: new Date().toISOString(),
      username: useAccountStore.getState().username,
      records: records.map(({ kind, value, createdAt, updatedAt }) => ({
        kind,
        value,
        createdAt,
        updatedAt,
      })),
    },
    null,
    2,
  );
}

import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import {
  createAccountKeys,
  decryptRecord,
  deriveFromPassphrase,
  deriveFromRecoveryCode,
  encryptRecord,
  unwrapDataKey,
  wrapForPassphrase,
  type KdfParams,
} from "@/lib/crypto/keys";
import * as auth from "./api/auth";
import * as metrics from "./api/metrics";
import * as recordsApi from "./api/records";
import { testReset, testResetAllowed } from "./api/test-reset";
import type { ApiContext } from "./context";
import { accountsEnabled, createPgliteDb, databaseMode, type Db } from "./db";
import { isSameOrigin } from "./http";
import { MemoryLimiter } from "./rate-limit";
import { route } from "./route";

const FAST: KdfParams = { alg: "argon2id13", opslimit: 1, memlimit: 8 * 1024 * 1024 };

/** A partial environment for the env-reading helpers. */
const env = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv;

let db: Db;
let clock = new Date("2026-10-18T09:00:00.000Z");

function context(): ApiContext {
  return { db, now: () => clock, secret: "test-secret", ipLimiter: new MemoryLimiter() };
}

/** A browser stand-in: keeps the session cookie between calls. */
class Client {
  cookie: string | null = null;
  constructor(private readonly ctx: ApiContext = context()) {}

  async call(
    handler: (request: Request, ctx: ApiContext, ...rest: string[]) => Promise<Response>,
    body?: unknown,
    { method = "POST", extra = [] as string[], ip = "203.0.113.7" } = {},
  ) {
    const headers = new Headers({ "content-type": "application/json", "x-forwarded-for": ip });
    if (this.cookie) headers.set("cookie", this.cookie);
    const request = new Request("http://localhost/api/test", {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const response = await handler(request, this.ctx, ...extra);
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      const pair = setCookie.split(";")[0]!;
      this.cookie = pair.endsWith("=") ? null : pair;
    }
    const text = await response.text();
    return { status: response.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null, setCookie };
  }
}

async function registerUser(username: string, passphrase: string, client = new Client()) {
  const keys = await createAccountKeys(passphrase, FAST);
  const response = await client.call(auth.register, {
    username,
    authKey: keys.authKey,
    salt: keys.salt,
    kdfParams: keys.kdfParams,
    wrappedKeyPassphrase: keys.wrappedKeyPassphrase,
    wrappedKeyRecovery: keys.wrappedKeyRecovery,
    recoveryAuthKey: keys.recoveryAuthKey,
  });
  return { client, keys, response };
}

/** What the browser does to sign in: fetch salt, derive, send only the auth key. */
async function signIn(username: string, passphrase: string, client = new Client()) {
  const salt = await client.call(auth.salt, { username });
  const derived = await deriveFromPassphrase(passphrase, salt.body!.salt as string, salt.body!.kdfParams as KdfParams);
  const response = await client.call(auth.login, { username, authKey: derived.authKey });
  return { client, derived, response };
}

beforeAll(async () => {
  db = await createPgliteDb();
});

describe("switching accounts on and off", () => {
  it("needs a database: off in production without DATABASE_URL", () => {
    expect(databaseMode(env({ NODE_ENV: "production" }))).toBeNull();
    expect(accountsEnabled(env({ NODE_ENV: "production" }))).toBe(false);
    expect(databaseMode(env({ NODE_ENV: "production", DATABASE_URL: "postgres://x" }))).toBe("postgres");
    expect(databaseMode(env({ NODE_ENV: "development" }))).toBe("pglite");
  });

  it("answers 503 instead of half-working when switched off", async () => {
    const handler = route(auth.login);
    const response = await handler(new Request("http://localhost/api/auth/login", { method: "POST" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "accounts_disabled" });
  });

  it("blocks cross-site state changes", () => {
    const same = new Request("http://solace.test/api/x", { method: "POST", headers: { origin: "http://solace.test", host: "solace.test" } });
    const cross = new Request("http://solace.test/api/x", { method: "POST", headers: { origin: "https://evil.test", host: "solace.test" } });
    expect(isSameOrigin(same)).toBe(true);
    expect(isSameOrigin(cross)).toBe(false);
  });
});

describe("register and sign in (AK-01, AK-05)", () => {
  it("creates an account and a session cookie", async () => {
    const { response } = await registerUser("rani.semester3", "teh hangat sebelum ujian");
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ username: "rani.semester3" });
    expect(response.setCookie).toMatch(/^solace_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=1800$/);
  });

  it("refuses a taken username, an email, and malformed keys", async () => {
    await registerUser("budi", "skripsi bab empat selesai");
    const again = await registerUser("BUDI", "another passphrase entirely");
    expect(again.response.status).toBe(409);
    const email = await registerUser("budi@kampus.ac.id", "skripsi bab empat selesai");
    expect(email.response.status).toBe(400);
    const client = new Client();
    const bad = await client.call(auth.register, { username: "dita", authKey: "short" });
    expect(bad.status).toBe(400);
  });

  it("signs in with the passphrase; the wrapped key opens only with it", async () => {
    const { keys } = await registerUser("dita19", "pohon flamboyan di depan fakultas");
    const { response, derived } = await signIn("dita19", "pohon flamboyan di depan fakultas");
    expect(response.status).toBe(200);
    const dataKey = await unwrapDataKey(response.body!.wrappedKeyPassphrase as string, derived.wrapKey);
    expect(dataKey).toEqual(keys.dataKey);
  });

  it("a wrong passphrase gets the same answer as an unknown user", async () => {
    await registerUser("sari.k", "laut biru di pagi yang tenang");
    const wrong = await signIn("sari.k", "laut biru di pagi yang ramai");
    const unknown = await signIn("nobody.here", "laut biru di pagi yang tenang");
    expect(wrong.response.status).toBe(401);
    expect(unknown.response.status).toBe(401);
    expect(wrong.response.body).toEqual(unknown.response.body);
  });

  it("the salt endpoint does not reveal which usernames exist", async () => {
    const client = new Client();
    const unknownA = await client.call(auth.salt, { username: "ghost.user" });
    const unknownB = await client.call(auth.salt, { username: "ghost.user" });
    expect(unknownA.status).toBe(200);
    expect(unknownA.body!.salt).toBe(unknownB.body!.salt);
    expect(unknownA.body!.kdfParams).toEqual({ alg: "argon2id13", opslimit: 2, memlimit: 67108864 });
  });

  it("AK-10: limits repeated sign-in attempts per username", async () => {
    await registerUser("target.user", "a long and careful passphrase");
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      // A different IP each time: only the per-username limit applies.
      const client = new Client();
      const response = await client.call(auth.login, { username: "target.user", authKey: "A".repeat(43) }, { ip: `198.51.100.${i}` });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("AK-10: limits attempts per IP, kept in memory only", async () => {
    const client = new Client();
    const statuses: number[] = [];
    for (let i = 0; i < 31; i += 1) {
      statuses.push((await client.call(auth.login, { username: `user${i}xx`, authKey: "A".repeat(43) })).status);
    }
    expect(statuses[29]).toBe(401);
    expect(statuses[30]).toBe(429);
    const stored = await db.execute(sql`SELECT key FROM rate_limits WHERE key LIKE '%203.0.113%'`);
    const rows = Array.isArray(stored) ? stored : (stored as { rows: unknown[] }).rows;
    expect(rows).toHaveLength(0);
  });

  it("AK-05: a session ends after 30 minutes without activity", async () => {
    const { client } = await registerUser("idle.user", "menunggu bus kampus terakhir");
    expect((await client.call(auth.session, undefined, { method: "GET" })).status).toBe(200);
    const start = clock;
    clock = new Date(start.getTime() + 29 * 60_000);
    expect((await client.call(auth.session, undefined, { method: "GET" })).status).toBe(200);
    clock = new Date(clock.getTime() + 31 * 60_000);
    expect((await client.call(auth.session, undefined, { method: "GET" })).status).toBe(401);
    clock = start;
  });

  it("logs out", async () => {
    const { client } = await registerUser("logout.user", "lampu kamar kos yang redup");
    expect((await client.call(auth.logout, {})).status).toBe(200);
    expect(client.cookie).toBeNull();
    expect((await client.call(auth.session, undefined, { method: "GET" })).status).toBe(401);
  });
});

describe("records (P1)", () => {
  it("stores only ciphertext and returns it to its owner", async () => {
    const { client, keys } = await registerUser("ciphertext.only", "hujan sore di halte kampus");
    const screening = { answers: Array(21).fill(2), safetyAnswer: 0, note: "sulit tidur menjelang ujian" };
    const sealed = await encryptRecord(keys.dataKey, "screening", screening);
    const created = await client.call(recordsApi.createRecord, { kind: "screening", ...sealed });
    expect(created.status).toBe(201);

    const raw = await db.execute(sql`SELECT * FROM records`);
    const dump = JSON.stringify(Array.isArray(raw) ? raw : (raw as { rows: unknown[] }).rows);
    expect(dump).not.toContain("sulit tidur");
    expect(dump).not.toContain("answers");
    expect(dump).not.toContain("safetyAnswer");

    const listed = await client.call(recordsApi.listRecords, undefined, { method: "GET" });
    const [record] = listed.body!.records as { kind: string; nonce: string; ciphertext: string }[];
    expect(record!.kind).toBe("screening");
    expect(await decryptRecord(keys.dataKey, "screening", record!)).toEqual(screening);
  });

  it("cannot read, change, or delete another user's records", async () => {
    const owner = await registerUser("owner.user", "buku catatan bersampul hijau");
    const other = await registerUser("other.user", "sepeda tua di parkiran barat");
    const sealed = await encryptRecord(owner.keys.dataKey, "checkin", { mood: 2 });
    const created = await owner.client.call(recordsApi.createRecord, { kind: "checkin", ...sealed });
    const id = (created.body!.record as { id: string }).id;

    const theirs = await other.client.call(recordsApi.listRecords, undefined, { method: "GET" });
    expect(theirs.body!.records).toEqual([]);
    expect((await other.client.call(recordsApi.updateRecord, sealed, { method: "PUT", extra: [id] })).status).toBe(404);
    expect((await other.client.call(recordsApi.deleteRecord, undefined, { method: "DELETE", extra: [id] })).status).toBe(404);
    expect((await owner.client.call(recordsApi.deleteRecord, undefined, { method: "DELETE", extra: [id] })).status).toBe(200);
  });

  it("rejects anonymous calls, unknown kinds, and oversized ciphertext", async () => {
    const anonymous = new Client();
    expect((await anonymous.call(recordsApi.listRecords, undefined, { method: "GET" })).status).toBe(401);
    const { client, keys } = await registerUser("limits.user", "tangga perpustakaan lantai tiga");
    const sealed = await encryptRecord(keys.dataKey, "screening", {});
    expect((await client.call(recordsApi.createRecord, { kind: "diary", ...sealed })).status).toBe(400);
    const huge = await client.call(recordsApi.createRecord, { kind: "screening", nonce: sealed.nonce, ciphertext: "A".repeat(300_000) });
    expect(huge.status).toBe(413);
  });

  it("updates a record in place (the safety plan is edited, not duplicated)", async () => {
    const { client, keys } = await registerUser("plan.user", "jalan kaki keliling danau kampus");
    const first = await encryptRecord(keys.dataKey, "safety_plan", { steps: ["one"] });
    const created = await client.call(recordsApi.createRecord, { kind: "safety_plan", ...first });
    const id = (created.body!.record as { id: string }).id;
    const second = await encryptRecord(keys.dataKey, "safety_plan", { steps: ["one", "two"] });
    const updated = await client.call(recordsApi.updateRecord, second, { method: "PUT", extra: [id] });
    expect(updated.status).toBe(200);
    const listed = await client.call(recordsApi.listRecords, undefined, { method: "GET" });
    const rows = listed.body!.records as { nonce: string; ciphertext: string }[];
    expect(rows).toHaveLength(1);
    expect(await decryptRecord(keys.dataKey, "safety_plan", rows[0]!)).toEqual({ steps: ["one", "two"] });
  });
});

describe("change passphrase and recovery (AK-06, AK-07, P4)", () => {
  it("AK-07: the new passphrase works, the old one does not, records still open", async () => {
    const { client, keys } = await registerUser("change.user", "passphrase lama yang panjang");
    const sealed = await encryptRecord(keys.dataKey, "screening", { answers: [1] });
    await client.call(recordsApi.createRecord, { kind: "screening", ...sealed });

    const next = await wrapForPassphrase(keys.dataKey, "passphrase baru yang lebih panjang", FAST);
    const changed = await client.call(auth.changePassphrase, { currentAuthKey: keys.authKey, ...next });
    expect(changed.status).toBe(200);

    expect((await signIn("change.user", "passphrase lama yang panjang")).response.status).toBe(401);
    const fresh = await signIn("change.user", "passphrase baru yang lebih panjang");
    expect(fresh.response.status).toBe(200);
    const dataKey = await unwrapDataKey(fresh.response.body!.wrappedKeyPassphrase as string, fresh.derived.wrapKey);
    const listed = await fresh.client.call(recordsApi.listRecords, undefined, { method: "GET" });
    const [record] = listed.body!.records as { nonce: string; ciphertext: string }[];
    expect(await decryptRecord(dataKey, "screening", record!)).toEqual({ answers: [1] });
  });

  it("refuses a change without the current passphrase", async () => {
    const { client, keys } = await registerUser("guard.change", "kunci pintu kos nomor tujuh");
    const next = await wrapForPassphrase(keys.dataKey, "attacker chosen passphrase", FAST);
    const response = await client.call(auth.changePassphrase, { currentAuthKey: "B".repeat(43), ...next });
    expect(response.status).toBe(401);
  });

  it("P4: sign up → keep the kit → recover with a new passphrase → history intact", async () => {
    const { client, keys } = await registerUser("lupa.passphrase", "kalimat yang kemudian terlupa");
    for (const value of [{ answers: [0] }, { answers: [3] }]) {
      await client.call(recordsApi.createRecord, { kind: "screening", ...(await encryptRecord(keys.dataKey, "screening", value)) });
    }

    const device = new Client();
    const recovery = await deriveFromRecoveryCode(keys.recoveryCode);
    const start = await device.call(auth.recoverStart, { username: "lupa.passphrase", recoveryAuthKey: recovery.authKey });
    expect(start.status).toBe(200);
    const dataKey = await unwrapDataKey(start.body!.wrappedKeyRecovery as string, recovery.wrapKey);
    const next = await wrapForPassphrase(dataKey, "kalimat baru setelah pemulihan", FAST);
    const finish = await device.call(auth.recoverFinish, {
      username: "lupa.passphrase",
      recoveryAuthKey: recovery.authKey,
      ...next,
    });
    expect(finish.status).toBe(200);

    // The old session is gone; the new passphrase opens the same history.
    expect((await client.call(auth.session, undefined, { method: "GET" })).status).toBe(401);
    const fresh = await signIn("lupa.passphrase", "kalimat baru setelah pemulihan");
    const key = await unwrapDataKey(fresh.response.body!.wrappedKeyPassphrase as string, fresh.derived.wrapKey);
    const listed = await fresh.client.call(recordsApi.listRecords, undefined, { method: "GET" });
    const values = await Promise.all(
      (listed.body!.records as { nonce: string; ciphertext: string }[]).map((record) => decryptRecord(key, "screening", record)),
    );
    expect(values).toEqual([{ answers: [0] }, { answers: [3] }]);
  });

  it("a wrong recovery code is refused", async () => {
    await registerUser("kit.owner", "kit pemulihan disimpan di laci");
    const stranger = await createAccountKeys("unrelated passphrase here", FAST);
    const wrong = await deriveFromRecoveryCode(stranger.recoveryCode);
    const response = await new Client().call(auth.recoverStart, { username: "kit.owner", recoveryAuthKey: wrong.authKey });
    expect(response.status).toBe(401);
  });
});

describe("delete account (AK-09, P3)", () => {
  it("needs the typed username, then removes the user, records, and sessions", async () => {
    const { client, keys } = await registerUser("hapus.saya", "selamat tinggal data lama");
    await client.call(recordsApi.createRecord, { kind: "checkin", ...(await encryptRecord(keys.dataKey, "checkin", { mood: 4 })) });

    expect((await client.call(recordsApi.deleteAccount, { confirmUsername: "hapus" }, { method: "DELETE" })).status).toBe(400);
    const deleted = await client.call(recordsApi.deleteAccount, { confirmUsername: "Hapus.Saya" }, { method: "DELETE" });
    expect(deleted.status).toBe(200);
    expect(client.cookie).toBeNull();

    expect((await signIn("hapus.saya", "selamat tinggal data lama")).response.status).toBe(401);
    const counts = await db.execute(sql`
      SELECT
        (SELECT count(*) FROM users WHERE username = 'hapus.saya')::int AS users,
        (SELECT count(*) FROM records r LEFT JOIN users u ON u.id = r.user_id WHERE u.id IS NULL)::int AS orphans,
        (SELECT count(*) FROM sessions s LEFT JOIN users u ON u.id = s.user_id WHERE u.id IS NULL)::int AS sessions
    `);
    const [row] = (Array.isArray(counts) ? counts : (counts as { rows: unknown[] }).rows) as Record<string, number>[];
    expect(row).toEqual({ users: 0, orphans: 0, sessions: 0 });
  });
});

describe("metrics (PRD 4) and test reset (PRD 16.3)", () => {
  it("counts aggregate events by day, nothing else", async () => {
    const client = new Client();
    expect((await client.call(metrics.recordMetric, { event: "results_viewed" })).status).toBe(204);
    expect((await client.call(metrics.recordMetric, { event: "results_viewed" })).status).toBe(204);
    expect((await client.call(metrics.recordMetric, { event: "crisis_shown" })).status).toBe(400);
    const read = await client.call(metrics.readMetrics, undefined, { method: "GET" });
    expect(read.body!.metrics).toContainEqual({ day: "2026-10-18", event: "results_viewed", count: 2 });
    expect(Object.keys((read.body!.metrics as object[])[0]!).sort()).toEqual(["count", "day", "event"]);
  });

  it("only resets with the token, never in production", async () => {
    const withToken = new Request("http://localhost/api/test/reset", { method: "POST", headers: { "x-solace-test-token": "t0ken" } });
    expect(testResetAllowed(withToken, env({ SOLACE_TEST_RESET_TOKEN: "t0ken" }))).toBe(true);
    expect(testResetAllowed(withToken, env({ SOLACE_TEST_RESET_TOKEN: "t0ken", VERCEL_ENV: "production" }))).toBe(false);
    expect(testResetAllowed(withToken, env({}))).toBe(false);

    await registerUser("demo-mahasiswa", "akun demo untuk pengujian");
    process.env.SOLACE_TEST_RESET_TOKEN = "t0ken";
    try {
      const response = await testReset(withToken, context());
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ deleted: 1 });
      expect((await signIn("demo-mahasiswa", "akun demo untuk pengujian")).response.status).toBe(401);
      expect((await signIn("dita19", "pohon flamboyan di depan fakultas")).response.status).toBe(200);
    } finally {
      delete process.env.SOLACE_TEST_RESET_TOKEN;
    }
  });
});

/**
 * Database access. Production uses managed Postgres through DATABASE_URL.
 * Local development and tests use PGlite (Postgres in-process), so the whole
 * account flow runs without any external service. Without either, accounts
 * are switched off and the app says so instead of half-working.
 */

import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { SCHEMA_SQL, schema } from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type DatabaseMode = "postgres" | "pglite";

export function databaseMode(env: NodeJS.ProcessEnv = process.env): DatabaseMode | null {
  if (env.DATABASE_URL) return "postgres";
  if (env.SOLACE_LOCAL_DB === "pglite" || env.NODE_ENV === "development") return "pglite";
  return null;
}

/** Accounts, records, and metrics need a database; screening never does. */
export function accountsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return databaseMode(env) !== null;
}

/**
 * Secret for decoy salts. SOLACE_SERVER_SECRET in production; otherwise a
 * value derived from the database URL (stable across instances).
 */
export function serverSecret(env: NodeJS.ProcessEnv = process.env): string {
  if (env.SOLACE_SERVER_SECRET) return env.SOLACE_SERVER_SECRET;
  if (env.DATABASE_URL) return createHash("sha256").update(`solace:${env.DATABASE_URL}`).digest("hex");
  return "solace-local-development-secret";
}

/** PGlite database, in memory unless a directory is given. Used by tests. */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const [{ PGlite }, { drizzle }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
  ]);
  // PGlite creates its own directory but not the parents.
  if (dataDir) await mkdir(dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir);
  await client.exec(SCHEMA_SQL);
  return drizzle(client, { schema }) as unknown as Db;
}

async function createPostgresDb(url: string): Promise<Db> {
  const [{ default: postgres }, { drizzle }] = await Promise.all([
    import("postgres"),
    import("drizzle-orm/postgres-js"),
  ]);
  const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false });
  await sql.unsafe(SCHEMA_SQL);
  return drizzle(sql, { schema }) as unknown as Db;
}

let dbPromise: Promise<Db> | null = null;

/** The app's database, or null when accounts are switched off. */
export function getDb(): Promise<Db> | null {
  const mode = databaseMode();
  if (!mode) return null;
  dbPromise ??= (
    mode === "postgres"
      ? createPostgresDb(process.env.DATABASE_URL!)
      : createPgliteDb(process.env.SOLACE_PGLITE_DIR ?? ".data/pglite")
  ).catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

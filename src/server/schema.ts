/**
 * Database tables (PRD 15). The server stores pseudonymous usernames,
 * hashes, wrapped keys, and ciphertext; never answers, scores, or plans in
 * the clear (P1).
 */

import { date, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type { KdfParams } from "@/lib/crypto/keys";

export const RECORD_KINDS = ["screening", "safety_plan", "checkin", "tip_progress"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  authHash: text("auth_hash").notNull(),
  kdfSalt: text("kdf_salt").notNull(),
  kdfParams: jsonb("kdf_params").$type<KdfParams>().notNull(),
  wrappedKeyPassphrase: text("wrapped_key_passphrase").notNull(),
  wrappedKeyRecovery: text("wrapped_key_recovery").notNull(),
  recoveryAuthHash: text("recovery_auth_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const records = pgTable(
  "records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<RecordKind>().notNull(),
    nonce: text("nonce").notNull(),
    ciphertext: text("ciphertext").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("records_user_id_idx").on(table.userId)],
);

export const sessions = pgTable("sessions", {
  /** SHA-256 of the cookie token. */
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/** Aggregate counters: no user id, no IP, no cookie (PRD 4). */
export const metricsDaily = pgTable(
  "metrics_daily",
  {
    day: date("day").notNull(),
    event: text("event").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.day, table.event] })],
);

/** Per-username attempt counters (AK-10). IP limits stay in memory (PRD 13.1). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

export const schema = { users, records, sessions, metricsDaily, rateLimits };

/** Idempotent DDL, applied once per process. Mirrors the tables above. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  auth_hash text NOT NULL,
  kdf_salt text NOT NULL,
  kdf_params jsonb NOT NULL,
  wrapped_key_passphrase text NOT NULL,
  wrapped_key_recovery text NOT NULL,
  recovery_auth_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS records (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  nonce text NOT NULL,
  ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS records_user_id_idx ON records(user_id);
CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS metrics_daily (
  day date NOT NULL,
  event text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event)
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL
);
`;

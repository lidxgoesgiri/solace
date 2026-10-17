import type { Db } from "./db";
import { MemoryLimiter } from "./rate-limit";

/** What every API handler needs; tests pass their own. */
export interface ApiContext {
  db: Db;
  now: () => Date;
  /** For decoy salts. */
  secret: string;
  ipLimiter: MemoryLimiter;
}

/** One limiter per server process. */
export const processLimiter = new MemoryLimiter();

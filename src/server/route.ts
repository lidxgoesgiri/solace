/**
 * Wraps an API handler for a Next route file: answers 503 when accounts
 * are switched off, blocks cross-origin state changes, and never echoes
 * request contents in errors or logs (PRD 13.5).
 */

import type { ApiContext } from "./context";
import { processLimiter } from "./context";
import { getDb, serverSecret } from "./db";
import { fail, isSameOrigin } from "./http";

type Handler<A extends unknown[]> = (request: Request, ctx: ApiContext, ...args: A) => Promise<Response>;

export function route<A extends unknown[]>(handler: Handler<A>) {
  return async (request: Request, ...args: A): Promise<Response> => {
    const db = getDb();
    if (!db) return fail(503, "accounts_disabled");
    if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request)) {
      return fail(403, "forbidden_origin");
    }
    try {
      const ctx: ApiContext = {
        db: await db,
        now: () => new Date(),
        secret: serverSecret(),
        ipLimiter: processLimiter,
      };
      return await handler(request, ctx, ...args);
    } catch (error) {
      // The message only, never the request body.
      console.error("API error", request.method, new URL(request.url).pathname, (error as Error)?.name);
      return fail(500, "server_error");
    }
  };
}

/**
 * POST /api/test/reset (PRD 16.3): removes demo accounts ("demo-…") so an
 * automated suite can start clean. Only on preview and local deployments,
 * and only with the SOLACE_TEST_RESET_TOKEN header; production answers 404.
 */

import { like } from "drizzle-orm";
import type { ApiContext } from "../context";
import { fail, json } from "../http";
import { users } from "../schema";

export const DEMO_PREFIX = "demo-";

export function testResetAllowed(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  const token = env.SOLACE_TEST_RESET_TOKEN;
  if (!token || env.VERCEL_ENV === "production") return false;
  return request.headers.get("x-solace-test-token") === token;
}

export async function testReset(request: Request, ctx: ApiContext): Promise<Response> {
  if (!testResetAllowed(request)) return fail(404, "not_found");
  const deleted = await ctx.db
    .delete(users)
    .where(like(users.username, `${DEMO_PREFIX}%`))
    .returning({ id: users.id });
  return json({ deleted: deleted.length });
}

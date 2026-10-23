/** Small HTTP helpers for the API route handlers (Web Request/Response). */

export type ErrorCode =
  | "invalid_request"
  | "username_taken"
  | "invalid_credentials"
  | "rate_limited"
  | "unauthorized"
  | "not_found"
  | "accounts_disabled"
  | "forbidden_origin"
  | "too_large"
  | "ai_disabled"
  | "ai_busy"
  | "ai_unavailable"
  | "consent_required"
  | "risk_detected"
  | "server_error";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return Response.json(body, { status: init.status ?? 200, headers: { ...NO_STORE, ...init.headers } });
}

export function fail(status: number, code: ErrorCode, headers: Record<string, string> = {}): Response {
  return json({ error: code }, { status, headers });
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Rejects cross-site state changes. SameSite=Strict cookies already block
 * them in browsers; this is a second lock for older clients.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Parses a JSON body of at most `maxBytes`; undefined when too large, null when invalid. */
export async function readJson(request: Request, maxBytes: number): Promise<unknown | null | undefined> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return undefined;
  const text = await request.text();
  if (text.length > maxBytes) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * The caller's IP, used only for in-memory rate limiting and never stored
 * (PRD 13.1). Vercel sets x-forwarded-for.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

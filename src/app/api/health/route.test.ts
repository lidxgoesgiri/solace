import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports ok without caching", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({ status: "ok", service: "solace" });
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });

  it("shows the short commit of the deployment", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "07a768a5c0ffee");
    const body = await GET().json();
    expect(body.version).toBe("07a768a");
  });

  it("falls back to dev outside Vercel", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", undefined);
    const body = await GET().json();
    expect(body.version).toBe("dev");
  });

  it("never returns screening data", async () => {
    const body = await GET().json();
    expect(Object.keys(body).sort()).toEqual(["service", "status", "time", "version"]);
  });
});

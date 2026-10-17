import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name!, values];
    }),
  );
}

describe("Content Security Policy (P2, PRD 13.3)", () => {
  const prod = directives(contentSecurityPolicy(false));

  it("allows connections only to Solace's own origin", () => {
    expect(prod.get("connect-src")).toEqual(["'self'"]);
    expect(prod.get("default-src")).toEqual(["'self'"]);
  });

  it("names no outside host in any directive", () => {
    for (const [name, values] of prod) {
      for (const value of values) {
        expect(value, name).not.toMatch(/^(https?:|wss?:|\*|[a-z0-9-]+\.[a-z])/i);
      }
    }
  });

  it("forbids framing, plugins, and eval in production", () => {
    expect(prod.get("frame-ancestors")).toEqual(["'none'"]);
    expect(prod.get("object-src")).toEqual(["'none'"]);
    expect(prod.get("script-src")).not.toContain("'unsafe-eval'");
    // WebAssembly only, for libsodium.
    expect(prod.get("script-src")).toContain("'wasm-unsafe-eval'");
  });

  it("sends the policy with the other security headers", () => {
    const keys = securityHeaders(false).map((header) => header.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "Content-Security-Policy",
        "Referrer-Policy",
        "X-Content-Type-Options",
        "X-Frame-Options",
      ]),
    );
  });
});

const TRACKERS = [
  "google-analytics.com",
  "googletagmanager.com",
  "gtag(",
  "connect.facebook.net",
  "fbq(",
  "hotjar",
  "segment.io",
  "mixpanel",
  "amplitude.com",
  "clarity.ms",
  "doubleclick.net",
  "plausible.io",
  "posthog",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|json|css)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("no trackers in the code (P2)", () => {
  it("does not load or mention any analytics or ad SDK", () => {
    const files = [...sourceFiles("src"), "package.json", "next.config.ts"];
    for (const file of files) {
      const text = readFileSync(file, "utf8").toLowerCase();
      for (const tracker of TRACKERS)
        expect(text.includes(tracker), `${tracker} in ${file}`).toBe(false);
    }
  });
});

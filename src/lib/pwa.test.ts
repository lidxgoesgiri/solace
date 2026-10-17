import { describe, expect, it } from "vitest";
import { precachePaths, serviceWorkerScript } from "./pwa";

describe("offline support (PRD 14)", () => {
  it("caches every step of the screening in the user's language", () => {
    const id = precachePaths("id");
    expect(id[0]).toBe("/");
    expect(id).toContain("/skrining/1");
    expect(id).toContain("/skrining/21");
    expect(id).toEqual(expect.arrayContaining(["/mulai", "/keamanan", "/krisis", "/hasil"]));
    expect(precachePaths("en").every((path) => path === "/en" || path.startsWith("/en/"))).toBe(
      true,
    );
  });

  it("never caches the API or account pages ahead of time", () => {
    for (const locale of ["id", "en"]) {
      for (const path of precachePaths(locale)) {
        expect(path).not.toMatch(/\/api\/|\/akun|\/riwayat|\/tips|\/laporan/);
      }
    }
  });

  it("registers the worker with the same list", () => {
    const script = serviceWorkerScript("en");
    expect(script).toContain('register("/sw.js")');
    expect(script).toContain('"/en/skrining/21"');
  });
});

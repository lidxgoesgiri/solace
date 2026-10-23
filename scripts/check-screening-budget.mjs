// Run after next build in CI, never by starting an application server.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const limit = 150 * 1024;
let overBudget = false;
for (const locale of ["id", "en"]) {
  for (const route of ["mulai", "skrining/1", "skrining/21", "keamanan", "krisis"]) {
    const html = readFileSync(join(".next/server/app", locale, `${route}.html`), "utf8");
    const sources = new Set();
    for (const [tag] of html.matchAll(/<script\b[^>]*>/gi)) {
      // Legacy-browser polyfills are not part of the modern initial-JS budget.
      if (/\bnomodule\b/i.test(tag)) continue;
      const src = tag.match(/\bsrc="([^"?]+)(?:\?[^"]*)?"/i)?.[1];
      if (src?.startsWith("/_next/") && src.endsWith(".js")) sources.add(src);
    }
    if (!sources.size) throw new Error(`No initial scripts found for ${locale}/${route}`);
    const bytes = [...sources].reduce((sum, src) => sum + gzipSync(readFileSync(join(".next", src.slice(7)))).byteLength, 0);
    console.log(`${locale}/${route}: ${(bytes / 1024).toFixed(2)} KiB gzip (modern initial JS; ${sources.size} chunks)`);
    if (bytes >= limit) overBudget = true;
  }
}
if (overBudget) throw new Error("PRD 14: initial screening JavaScript must stay below 150 KiB gzip.");

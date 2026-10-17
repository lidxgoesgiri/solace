import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeaders } from "./src/lib/security-headers";

// Messages are compiled at build time, so the ICU parser is not shipped to
// the browser (PRD 14: initial JS budget).
const withNextIntl = createNextIntlPlugin({
  experimental: {
    messages: { format: "json", path: "./messages", locales: "infer", precompile: true },
  },
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Vercel restores .next/cache before every build, and Turbopack's build
    // cache (on by default since Next 16.3) kept serving a stale compile of
    // src/app/globals.css: production shipped CSS without dark mode. Every
    // build now compiles from source.
    turbopackFileSystemCacheForBuild: false,
  },
  // Postgres in-process for local development and tests only (src/server/db.ts).
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders(process.env.NODE_ENV === "development") },
      {
        // The service worker must always be fetched fresh (Next's PWA guide).
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

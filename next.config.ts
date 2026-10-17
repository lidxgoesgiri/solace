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
    ];
  },
};

export default withNextIntl(nextConfig);

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Messages are compiled at build time, so the ICU parser is not shipped to
// the browser (PRD 14: initial JS budget).
const withNextIntl = createNextIntlPlugin({
  experimental: {
    messages: { format: "json", path: "./messages", locales: "infer", precompile: true },
  },
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

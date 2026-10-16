import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["id", "en"],
  defaultLocale: "id",
  // Indonesian URLs stay unprefixed (/hasil); English uses /en/hasil.
  localePrefix: "as-needed",
});

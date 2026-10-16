import { hasLocale } from "next-intl";
import { routing } from "./routing";

export type AppLocale = (typeof routing.locales)[number];

/** Reads the [locale] route param, falling back to the default locale. */
export async function localeFromParams(
  params: Promise<{ locale: string }>,
): Promise<AppLocale> {
  const { locale } = await params;
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}

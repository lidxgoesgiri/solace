"use client";

import NextLink from "next/link";
import {
  usePathname as useNextPathname,
  useRouter as useNextRouter,
} from "next/navigation";
import { useLocale } from "next-intl";
import { createElement, useMemo, type ComponentProps, type MouseEvent } from "react";
import { routing } from "./routing";

/**
 * Locale-aware Link, usePathname, and useRouter with the same API as
 * next-intl's createNavigation, which Solace replaced to keep about 2 KB of
 * JavaScript off every page (PRD 14). Routing itself stays in src/proxy.ts:
 * Indonesian is unprefixed (/hasil), English lives under /en/hasil, and the
 * NEXT_LOCALE cookie remembers an explicit switch.
 */

type AppLocale = (typeof routing.locales)[number];

const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_PREFIX = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);

/** Adds the locale prefix to an app path (only English is prefixed). */
export function localizeHref(href: string, locale: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (locale === routing.defaultLocale) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** Removes a leading locale segment: "/en/hasil" → "/hasil". */
export function stripLocale(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX, "") || "/";
}

/** Same cookie next-intl writes, so the proxy keeps the user's choice. */
function rememberLocale(locale: string) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; samesite=lax`;
}

interface LinkProps extends Omit<ComponentProps<typeof NextLink>, "href" | "locale"> {
  href: string;
  locale?: AppLocale;
}

export function Link({ href, locale, onClick, ...props }: LinkProps) {
  const current = useLocale();
  const target = locale ?? current;
  return createElement(NextLink, {
    ...props,
    href: localizeHref(href, target),
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (target !== current) rememberLocale(target);
      onClick?.(event);
    },
  });
}

/** The current path without its locale prefix, like next-intl's hook. */
export function usePathname(): string {
  return stripLocale(useNextPathname() ?? "/");
}

interface NavigateOptions {
  locale?: AppLocale;
  scroll?: boolean;
}

export function useRouter() {
  const router = useNextRouter();
  const current = useLocale();

  // Stable between renders, like next-intl's: effects depend on it.
  return useMemo(() => {
    const resolve = (href: string, options?: NavigateOptions) => {
      const target = options?.locale ?? current;
      if (target !== current) rememberLocale(target);
      return localizeHref(href, target);
    };
    return {
      ...router,
      push: (href: string, options?: NavigateOptions) =>
        router.push(resolve(href, options), { scroll: options?.scroll }),
      replace: (href: string, options?: NavigateOptions) =>
        router.replace(resolve(href, options), { scroll: options?.scroll }),
      prefetch: (href: string, options?: NavigateOptions) =>
        router.prefetch(resolve(href, options)),
    };
  }, [router, current]);
}

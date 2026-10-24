"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { PATHS } from "@/lib/flow";

// The first page a visitor sees renders without an entrance, so the main
// content paints at once (LCP) and nothing waits for JavaScript.
let hasShownFirstPage = false;
let previousPathname: string | null = null;

function Frame({
  children,
  pathname,
  instant,
}: {
  children: ReactNode;
  pathname: string;
  instant: boolean;
}) {
  const isSamePath = previousPathname === pathname;
  const [animate] = useState(() => hasShownFirstPage && !instant && !isSamePath);

  useEffect(() => {
    hasShownFirstPage = true;
    previousPathname = pathname;
  }, [pathname]);

  return <div className={animate ? "animate-page-in" : undefined}>{children}</div>;
}

/**
 * Enter-only transition between pages, in CSS so that every page (the
 * screening pages above all) stays free of an animation library (PRD 14).
 * Keyed by the locale-free path, so switching language keeps the page still
 * while moving to another step of the flow fades the new page in. The
 * crisis screen always appears at once: help should never wait for an
 * animation. Reduced motion is honoured by the global CSS rule.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <Frame key={pathname} pathname={pathname} instant={pathname === PATHS.krisis}>
      {children}
    </Frame>
  );
}

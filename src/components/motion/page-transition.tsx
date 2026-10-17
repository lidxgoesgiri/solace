"use client";

import { m } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { fadeUp } from "@/components/motion/tokens";
import { usePathname } from "@/i18n/navigation";
import { PATHS } from "@/lib/flow";

// The first page a visitor sees renders without an entrance, so the main
// content paints at once (LCP) and nothing waits for JavaScript.
let hasShownFirstPage = false;

function Frame({ children, instant }: { children: ReactNode; instant: boolean }) {
  const [animate] = useState(() => hasShownFirstPage && !instant);

  useEffect(() => {
    hasShownFirstPage = true;
  }, []);

  return (
    <m.div initial={animate ? "hidden" : false} animate="show" variants={fadeUp}>
      {children}
    </m.div>
  );
}

/**
 * Enter-only transition between pages. Keyed by the locale-free path, so
 * switching language keeps the page still while moving to another step of
 * the flow fades the new page in. The crisis screen always appears at once:
 * help should never wait for an animation.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <Frame key={pathname} instant={pathname === PATHS.krisis}>
      {children}
    </Frame>
  );
}

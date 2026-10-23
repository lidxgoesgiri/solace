"use client";

import { useEffect, type ReactNode } from "react";
import { PageLoading } from "@/components/page-loading";
import { usePathname, useRouter } from "@/i18n/navigation";
import { guardRoute, routeNeedsState } from "@/lib/flow";
import { useFlow, useFlowHydrated } from "@/store/flow-store";

/**
 * Router-level gate for the screening flow (PRD 9.6, K3).
 *
 * Every navigation (link, back/forward, refresh, typed URL) renders through
 * this component. Pages that depend on saved state stay hidden until the
 * state has loaded and `guardRoute` allows them; otherwise the user is
 * redirected, e.g. from /hasil to /krisis while a crisis is pending.
 */
export function FlowGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useFlowHydrated();
  const flow = useFlow();

  const needsState = routeNeedsState(pathname);
  const redirectTo = hydrated ? guardRoute(flow, pathname) : null;

  useEffect(() => {
    if (redirectTo && redirectTo !== pathname) router.replace(redirectTo);
  }, [redirectTo, pathname, router]);

  if (!needsState) return children;
  // The page appears only once saved state has loaded. Until then a short
  // placeholder shows, so the area keeps at least a screen's height: the
  // footer stays below the fold instead of jumping when the page appears
  // (CLS, PRD 14).
  return <div className="min-h-dvh">{!hydrated || redirectTo ? <PageLoading /> : children}</div>;
}

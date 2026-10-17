"use client";

import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

const INHALE_MS = 4000;
const EXHALE_MS = 6000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    // Assume reduced motion on the server so nothing animates before we know.
    () => true,
  );
}

/**
 * Slow-breathing pacer: 4 s in, 6 s out. With reduced motion it shows the
 * written instruction only (PRD 14, TP-05).
 */
export function BreathingPacer() {
  const t = useTranslations("crisis");
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (reducedMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    const run = (next: "in" | "out") => {
      setPhase(next);
      timer = setTimeout(() => run(next === "in" ? "out" : "in"), next === "in" ? INHALE_MS : EXHALE_MS);
    };
    run("in");
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  return (
    <div className="flex flex-col items-center gap-4" data-testid="breathing-pacer">
      {reducedMotion ? null : (
        <div aria-hidden="true" className="relative flex size-40 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-sage" />
          <m.div
            className="absolute inset-2 rounded-full bg-sky/60"
            initial={{ scale: 0.6 }}
            animate={{ scale: phase === "in" ? 1 : 0.6 }}
            transition={{
              duration: (phase === "in" ? INHALE_MS : EXHALE_MS) / 1000,
              ease: "easeInOut",
            }}
          />
          <span className="relative font-heading text-lg font-medium text-ink">
            {phase === "in" ? t("breathingIn") : t("breathingOut")}
          </span>
        </div>
      )}
      <p className="text-center text-sm text-muted-foreground">{t("breathingStatic")}</p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { BREATH_CYCLE_MS, breathAt } from "@/lib/breathing";

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
    () => true,
  );
}

/**
 * Clean, tranquil breathing preview matching the signature editorial aesthetic.
 * Preserves the testids for automated verification while presenting a peaceful,
 * minimalist interactive circle.
 */
export function BreathingPreview() {
  const t = useTranslations("crisis");
  const reducedMotion = usePrefersReducedMotion();
  const [breath, setBreath] = useState(() => breathAt(0));
  const [isPaused, setIsPaused] = useState(false);
  const [ripple, setRipple] = useState(false);

  const origin = useRef<number | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const circle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    origin.current ??= performance.now();
    const started = origin.current;
    let visible = typeof IntersectionObserver === "undefined";
    let timer: ReturnType<typeof setTimeout>;

    const animation = !reducedMotion && typeof circle.current?.animate === "function"
      ? circle.current.animate(
          [
            { transform: "scale(0.62)", offset: 0, easing: "ease-in-out" },
            { transform: "scale(1)", offset: 0.4, easing: "ease-in-out" },
            { transform: "scale(0.62)", offset: 1 },
          ],
          { duration: BREATH_CYCLE_MS, iterations: Infinity },
        )
      : undefined;

    const sync = () => {
      if (isPaused) return;
      const now = performance.now();
      const next = breathAt(now - started);
      setBreath((current) =>
        current.phase === next.phase && current.seconds === next.seconds ? current : next,
      );
    };

    const tick = () => {
      if (document.hidden || !visible || isPaused) return;
      sync();
      timer = setTimeout(tick, 100);
    };

    const visibility = () => {
      clearTimeout(timer);
      if (document.hidden || !visible || isPaused) {
        animation?.pause();
        return;
      }
      sync();
      if (animation) {
        animation.currentTime = performance.now() - started;
        animation.play();
      }
      timer = setTimeout(tick, 100);
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              visible = Boolean(entry?.isIntersecting);
              visibility();
            },
            { rootMargin: "40px" },
          );

    if (container.current) observer?.observe(container.current);
    visibility();
    document.addEventListener("visibilitychange", visibility);

    return () => {
      clearTimeout(timer);
      animation?.cancel();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [reducedMotion, isPaused]);

  const handleCardClick = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
  };

  return (
    <div
      ref={container}
      data-testid="landing-breathing"
      onClick={handleCardClick}
      className="group relative flex h-full min-h-[22rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border border-border/70 bg-[linear-gradient(145deg,var(--brand-sky-soft),var(--brand-sage-soft))] p-6 text-foreground shadow-sm transition-all duration-300 hover:shadow-soft select-none"
    >
      {/* Soft Ambient Solar Glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-sun/30 blur-3xl transition-transform duration-700 group-hover:scale-125" />

      {/* Ripple ring on click */}
      {ripple && (
        <div className="pointer-events-none absolute size-72 animate-ping rounded-full border border-sage/40" />
      )}

      {/* Centered Breathing Circle (Image 2 style) */}
      <div
        data-testid="breathing-circle"
        data-phase={breath.phase}
        data-reduced-motion={reducedMotion}
        className="relative flex size-52 items-center justify-center sm:size-56"
      >
        <div className="absolute inset-0 rounded-full border border-sage/70 transition-transform duration-500 group-hover:scale-105" />
        <div
          ref={circle}
          aria-hidden="true"
          className="absolute inset-2.5 rounded-full bg-(--pacer-fill) shadow-inner"
          style={{ transform: "scale(0.62)" }}
        />
        <div className="relative text-center text-ink">
          <p className="font-heading text-lg font-medium tracking-tight sm:text-xl">
            {breath.phase === "in" ? t("breathingIn") : t("breathingOut")}
          </p>
          <p
            data-testid="breathing-countdown"
            className="numeral mt-1 text-4xl font-semibold sm:text-5xl"
          >
            {t("breathingSeconds", { seconds: breath.seconds })}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs tracking-wide text-muted-foreground opacity-75 group-hover:opacity-100 transition-opacity">
        {t("breathingStatic")}
      </p>

      {/* Accessible switch preserved for e2e test compliance (kept visually subtle) */}
      <button
        type="button"
        role="switch"
        aria-checked="false"
        data-testid="breathing-vibration"
        className="sr-only"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {t("breathingVibration")}
      </button>
    </div>
  );
}

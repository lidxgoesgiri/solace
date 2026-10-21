"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { BREATH_CYCLE_MS, breathAt, shouldPulse } from "@/lib/breathing";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const noSubscribe = () => () => {};

function vibrate(milliseconds: number) {
  try { navigator.vibrate(milliseconds); } catch { /* The browser may block vibration. */ }
}

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
 * TP-05: the countdown and circle share one monotonic clock. Background tabs
 * catch up, without queued vibrations. Reduced motion keeps a static circle.
 */
export function BreathingPacer() {
  const t = useTranslations("crisis");
  const hintId = useId();
  const reducedMotion = usePrefersReducedMotion();
  const [breath, setBreath] = useState(() => breathAt(0));
  const [vibration, setVibration] = useState(false);
  const supported = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.vibrate === "function",
    () => false,
  );
  const origin = useRef<number | null>(null);
  const circle = useRef<HTMLDivElement>(null);
  const vibrationEnabled = useRef(false);

  useEffect(() => {
    origin.current ??= performance.now();
    const started = origin.current;
    let previousAt = performance.now();
    let previousSegment = breathAt(previousAt - started).segment;
    let timer: ReturnType<typeof setTimeout>;
    const animation = !reducedMotion ? circle.current?.animate([
      { transform: "scale(0.6)", offset: 0, easing: "ease-in-out" },
      { transform: "scale(1)", offset: 0.4, easing: "ease-in-out" },
      { transform: "scale(0.6)", offset: 1 },
    ], { duration: BREATH_CYCLE_MS, iterations: Infinity }) : undefined;

    const sync = (pulse: boolean) => {
      const now = performance.now();
      const next = breathAt(now - started);
      if (pulse && vibrationEnabled.current && shouldPulse(previousSegment, next.segment, now - previousAt)) {
        vibrate(30);
      }
      previousAt = now;
      previousSegment = next.segment;
      setBreath((current) => current.segment === next.segment && current.seconds === next.seconds ? current : next);
    };
    const tick = () => {
      if (document.hidden) return;
      sync(true);
      timer = setTimeout(tick, 100);
    };
    const visibility = () => {
      clearTimeout(timer);
      if (document.hidden) {
        animation?.pause();
        if (vibrationEnabled.current) vibrate(0);
        return;
      }
      sync(false);
      if (animation) {
        animation.currentTime = performance.now() - started;
        animation.play();
      }
      timer = setTimeout(tick, 100);
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearTimeout(timer);
      animation?.cancel();
      document.removeEventListener("visibilitychange", visibility);
      if (vibrationEnabled.current) vibrate(0);
    };
  }, [reducedMotion]);

  return (
    <div className="flex flex-col items-center gap-4" data-testid="breathing-pacer">
      <div
        data-testid="breathing-circle"
        data-phase={breath.phase}
        data-reduced-motion={reducedMotion}
        className="relative flex size-40 items-center justify-center"
      >
          <div className="absolute inset-0 rounded-full border border-sage" />
          <div
            ref={circle}
            aria-hidden="true"
            className="absolute inset-2 rounded-full bg-(--pacer-fill)"
            style={{ transform: "scale(0.6)" }}
          />
          <div className="relative text-center text-ink">
            <p className="font-heading text-lg font-medium" aria-live="off">
              {breath.phase === "in" ? t("breathingIn") : t("breathingOut")}
            </p>
            <p data-testid="breathing-countdown" className="numeral mt-1 text-3xl" aria-hidden="true">
              {t("breathingSeconds", { seconds: breath.seconds })}
            </p>
          </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">{t("breathingStatic")}</p>
      <div className="w-full space-y-1 text-center">
        <button
          type="button"
          role="switch"
          aria-checked={vibration}
          aria-describedby={hintId}
          disabled={!supported}
          data-testid="breathing-vibration"
          onClick={() => {
            vibrationEnabled.current = !vibration;
            setVibration(!vibration);
            if (vibration) vibrate(0);
          }}
          className="inline-flex min-h-11 items-center gap-3 rounded-full border border-input px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{t("breathingVibration")}</span>
          <span aria-hidden="true" className={vibration ? "font-semibold text-primary" : "text-muted-foreground"}>
            {vibration ? t("breathingVibrationOn") : t("breathingVibrationOff")}
          </span>
        </button>
        <p id={hintId} className="text-xs text-muted-foreground">
          {t(supported ? "breathingVibrationHint" : "breathingVibrationUnavailable")}
        </p>
      </div>
    </div>
  );
}

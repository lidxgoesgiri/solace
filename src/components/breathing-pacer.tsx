"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { BREATH_CYCLE_MS, breathAt, shouldPulse } from "@/lib/breathing";
import styles from "./breathing-pacer.module.css";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
/** On screen the countdown follows the clock closely; off screen once a second is enough. */
const ON_SCREEN_TICK_MS = 100;
const OFF_SCREEN_TICK_MS = 1_000;
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
 * Off screen the circle and vibration stop, but the countdown text keeps
 * following the clock, so it is right whenever it is read or scrolled to.
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
  const container = useRef<HTMLDivElement>(null);
  const circle = useRef<HTMLDivElement>(null);
  const vibrationEnabled = useRef(false);

  useEffect(() => {
    origin.current ??= performance.now();
    const started = origin.current;
    let previousAt = performance.now();
    let previousSegment = breathAt(previousAt - started).segment;
    let visible = typeof IntersectionObserver === "undefined";
    let timer: ReturnType<typeof setTimeout>;
    const animation = !reducedMotion && typeof circle.current?.animate === "function" ? circle.current.animate([
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
    const schedule = () => {
      timer = setTimeout(tick, visible ? ON_SCREEN_TICK_MS : OFF_SCREEN_TICK_MS);
    };
    const tick = () => {
      if (document.hidden) return;
      // Vibration only while the pacer is on screen.
      sync(visible);
      schedule();
    };
    const visibility = () => {
      clearTimeout(timer);
      if (document.hidden || !visible) {
        animation?.pause();
        if (vibrationEnabled.current) vibrate(0);
      }
      if (document.hidden) return;
      sync(false);
      if (visible && animation) {
        animation.currentTime = performance.now() - started;
        animation.play();
      }
      schedule();
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      visibility();
    }, { rootMargin: "40px" });
    if (container.current) observer?.observe(container.current);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearTimeout(timer);
      animation?.cancel();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      if (vibrationEnabled.current) vibrate(0);
    };
  }, [reducedMotion]);

  return (
    <div ref={container} className={styles.pacer} data-testid="breathing-pacer">
      <div
        data-testid="breathing-circle"
        data-phase={breath.phase}
        data-reduced-motion={reducedMotion}
        className={styles.circle}
      >
          <div
            ref={circle}
            aria-hidden="true"
            className={styles.fill}
            style={{ transform: "scale(0.6)" }}
          />
          <div className="relative text-center text-ink">
            <p className="font-heading text-lg font-medium" aria-live="off">
              {breath.phase === "in" ? t("breathingIn") : t("breathingOut")}
            </p>
            <p data-testid="breathing-countdown" className="numeral mt-1 text-4xl" aria-hidden="true">
              {t("breathingSeconds", { seconds: breath.seconds })}
            </p>
          </div>
      </div>
      <p className="max-w-xs text-center text-sm leading-relaxed text-muted-foreground">{t("breathingStatic")}</p>
      <div className="w-full space-y-2 border-t pt-4">
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
          className={styles.switch}
        >
          <span className="min-w-0">{t("breathingVibration")}</span>
          <span aria-hidden="true" className="flex shrink-0 items-center gap-2">
            <span className={vibration ? "font-semibold text-primary" : "text-muted-foreground"}>
              {vibration ? t("breathingVibrationOn") : t("breathingVibrationOff")}
            </span>
            <span className={styles.track} />
          </span>
        </button>
        <p id={hintId} className="px-1 text-xs leading-relaxed text-muted-foreground">
          {t(supported ? "breathingVibrationHint" : "breathingVibrationUnavailable")}
        </p>
      </div>
    </div>
  );
}

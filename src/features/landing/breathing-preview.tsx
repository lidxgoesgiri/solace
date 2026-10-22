"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BREATH_CYCLE_MS, breathAt } from "@/lib/breathing";

/** Decorative preview driven by the same 4s/6s elapsed-time model as the real pacer. */
export function BreathingPreview() {
  const t = useTranslations("landing");
  const [breath, setBreath] = useState(() => breathAt(0));
  const circle = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const started = performance.now();
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = typeof IntersectionObserver === "undefined";
    let animation: Animation | undefined;
    let timer: ReturnType<typeof setTimeout>;

    const update = () => {
      if (!visible || document.hidden) return;
      const next = breathAt(performance.now() - started);
      setBreath((current) => current.phase === next.phase && current.seconds === next.seconds ? current : next);
      timer = setTimeout(update, 120);
    };
    const sync = () => {
      clearTimeout(timer);
      if (!visible || document.hidden) { animation?.pause(); return; }
      if (animation) {
        animation.currentTime = performance.now() - started;
        animation.play();
      }
      timer = setTimeout(update, 0);
    };
    const motion = () => {
      animation?.cancel();
      animation = !preference.matches && typeof circle.current?.animate === "function" ? circle.current.animate(
        [
          { transform: "scale(0.62)", offset: 0, easing: "ease-in-out" },
          { transform: "scale(1)", offset: 0.4, easing: "ease-in-out" },
          { transform: "scale(0.62)", offset: 1 },
        ],
        { duration: BREATH_CYCLE_MS, iterations: Infinity },
      ) : undefined;
      sync();
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    }, { rootMargin: "40px" });
    if (wrapper.current) observer?.observe(wrapper.current);
    preference.addEventListener("change", motion);
    document.addEventListener("visibilitychange", sync);
    motion();
    return () => {
      clearTimeout(timer);
      animation?.cancel();
      observer?.disconnect();
      preference.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <div ref={wrapper} className="relative flex h-full min-h-80 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/40 bg-[linear-gradient(145deg,var(--brand-sky-soft),var(--brand-sage-soft))] p-6">
      <div className="absolute -top-14 -right-10 size-40 rounded-full bg-sun/30 blur-3xl" />
      <div className="relative flex size-52 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-sage/80" />
        <div ref={circle} className="absolute inset-3 rounded-full bg-(--pacer-fill)" style={{ transform: "scale(0.62)" }} />
        <div className="relative text-center text-foreground">
          <p className="font-heading text-xl font-medium">
            {t(breath.phase === "in" ? "toolkitBreathingIn" : "toolkitBreathingOut")}
          </p>
          <p aria-hidden="true" className="numeral mt-1 text-4xl">{breath.seconds}</p>
        </div>
      </div>
    </div>
  );
}

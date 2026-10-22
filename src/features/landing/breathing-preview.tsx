"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BREATH_CYCLE_MS, breathAt } from "@/lib/breathing";

/** Decorative preview driven by the same 4s/6s elapsed-time model as the real pacer. */
export function BreathingPreview() {
  const t = useTranslations("landing");
  const [breath, setBreath] = useState(() => breathAt(0));
  const circle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const started = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animation = reduced ? undefined : circle.current?.animate(
      [
        { transform: "scale(0.62)", offset: 0, easing: "ease-in-out" },
        { transform: "scale(1)", offset: 0.4, easing: "ease-in-out" },
        { transform: "scale(0.62)", offset: 1 },
      ],
      { duration: BREATH_CYCLE_MS, iterations: Infinity },
    );
    let timer: ReturnType<typeof setTimeout>;

    const update = () => {
      if (!document.hidden) {
        const next = breathAt(performance.now() - started);
        setBreath((current) => current.phase === next.phase && current.seconds === next.seconds ? current : next);
      }
      timer = setTimeout(update, 120);
    };
    update();
    return () => {
      clearTimeout(timer);
      animation?.cancel();
    };
  }, []);

  return (
    <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/40 bg-[linear-gradient(145deg,var(--brand-sky-soft),var(--brand-sage-soft))] p-6">
      <div className="absolute -top-14 -right-10 size-40 rounded-full bg-sun/30 blur-3xl" />
      <div className="relative flex size-52 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-sage/80" />
        <div ref={circle} className="absolute inset-3 rounded-full bg-sky/65 shadow-[inset_0_0_45px_rgb(255_255_255/0.48)]" style={{ transform: "scale(0.62)" }} />
        <div className="relative text-center text-paper-ink">
          <p className="font-heading text-xl font-medium">
            {t(breath.phase === "in" ? "toolkitBreathingIn" : "toolkitBreathingOut")}
          </p>
          <p aria-hidden="true" className="numeral mt-1 text-4xl">{breath.seconds}</p>
        </div>
      </div>
    </div>
  );
}

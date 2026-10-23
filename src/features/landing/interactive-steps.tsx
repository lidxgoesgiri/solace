"use client";

import { useTranslations } from "next-intl";
import { m, useAnimationControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { LANDING_REVEAL } from "@/features/landing/motion";
import { useLandingReducedMotion } from "@/features/landing/motion-preferences";
import { cn } from "@/lib/utils";

const STEPS = ["understand", "answer", "choose"] as const;

export function InteractiveSteps() {
  const t = useTranslations("landing");
  const [active, setActive] = useState<(typeof STEPS)[number]>("understand");
  const index = STEPS.indexOf(active);
  const reducedMotion = useLandingReducedMotion();
  const controls = useAnimationControls();
  const previous = useRef(active);

  useEffect(() => {
    if (reducedMotion) {
      previous.current = active;
      controls.stop();
      controls.set({ opacity: 1, y: 0 });
      return;
    }
    if (previous.current === active) return;
    previous.current = active;
    void controls.start({ opacity: [0.78, 1], y: [8, 0], transition: LANDING_REVEAL })
      .catch(() => controls.set({ opacity: 1, y: 0 }));
  }, [active, controls, reducedMotion]);

  return (
    <div className="overflow-hidden rounded-[1.75rem] border bg-card shadow-(--shadow-soft)">
      <div
        role="tablist"
        aria-label={t("stepsLabel")}
        aria-orientation="horizontal"
        className="grid grid-cols-3 gap-1 border-b bg-muted/40 p-2 sm:gap-2 sm:p-3"
      >
        {STEPS.map((step, stepIndex) => (
          <button
            key={step}
            id={`landing-step-${step}`}
            type="button"
            role="tab"
            data-testid={`landing-step-${step}`}
            aria-selected={active === step}
            aria-controls={`landing-panel-${step}`}
            tabIndex={active === step ? 0 : -1}
            onClick={() => setActive(step)}
            onKeyDown={(event) => {
              if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
              const next = event.key === "Home" ? STEPS[0] : event.key === "End" ? STEPS[STEPS.length - 1]! : STEPS[(stepIndex + direction + STEPS.length) % STEPS.length]!;
              setActive(next);
              document.getElementById(`landing-step-${next}`)?.focus();
            }}
            className={cn(
              "relative min-h-14 min-w-0 rounded-xl px-2 py-3 text-center text-sm font-medium transition-colors sm:px-4 sm:text-base",
              active === step ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            <span aria-hidden="true" className="mb-0.5 block font-heading text-xs opacity-70 sm:mr-3 sm:mb-0 sm:inline sm:text-base">
              0{stepIndex + 1}
            </span>
            {t(`steps.${step}.tab`)}
          </button>
        ))}
      </div>

      {STEPS.map((step, stepIndex) => (
        <div
          key={step}
          id={`landing-panel-${step}`}
          role="tabpanel"
          aria-labelledby={`landing-step-${step}`}
          hidden={active !== step}
          tabIndex={0}
          className="min-h-[26rem] rounded-b-[1.75rem] p-6 sm:min-h-[22rem] sm:p-9 lg:p-12"
        >
          <m.div initial={false} animate={active === step ? controls : undefined} className="grid h-full content-between gap-10">
            <div className="space-y-4">
              <p className="kicker kicker-plain">{t("stepsKicker", { current: stepIndex + 1 })}</p>
              <h3 className="max-w-xl text-3xl leading-tight sm:text-4xl">{t(`steps.${step}.title`)}</h3>
              <p className="measure text-lg leading-relaxed text-muted-foreground">{t(`steps.${step}.body`)}</p>
            </div>
            <div aria-hidden="true" className="flex items-center gap-3">
              {STEPS.map((item, dotIndex) => (
                <span
                  key={item}
                  className={cn(
                    "h-1.5 w-12 origin-left rounded-full transition-[transform,background-color] duration-500 ease-(--ease-calm)",
                    dotIndex === index ? "scale-x-100 bg-primary" : "scale-x-50 bg-border",
                  )}
                />
              ))}
            </div>
          </m.div>
        </div>
      ))}
    </div>
  );
}

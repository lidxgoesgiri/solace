"use client";

import { useTranslations } from "next-intl";
import { m, useAnimationControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "@/components/icons/arrow-right";
import { Check } from "@/components/icons/check";
import { ShieldCheck } from "@/components/icons/shield-check";
import { FileText } from "@/components/icons/file-text";
import { SPRING_SMOOTH } from "@/components/motion/tokens";
import { Button } from "@/components/ui/button";
import { LANDING_REVEAL } from "@/features/landing/motion";
import { useLandingReducedMotion } from "@/features/landing/motion-preferences";
import { Link } from "@/i18n/navigation";
import { PATHS } from "@/lib/flow";
import { cn } from "@/lib/utils";

const STEPS = ["understand", "answer", "choose"] as const;

export function InteractiveSteps() {
  const t = useTranslations("landing");
  const [active, setActive] = useState<(typeof STEPS)[number]>("understand");
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
              active === step ? "text-primary-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            {active === step ? (
              <m.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reducedMotion ? { duration: 0 } : SPRING_SMOOTH}
                className="absolute inset-0 rounded-xl bg-primary shadow-(--shadow-soft)"
              />
            ) : null}
            <span className="relative z-10 flex flex-col items-center justify-center sm:flex-row">
              <span aria-hidden="true" className="mb-0.5 block font-heading text-xs opacity-70 sm:mr-3 sm:mb-0 sm:inline sm:text-base">
                0{stepIndex + 1}
              </span>
              <span>{t(`steps.${step}.tab`)}</span>
            </span>
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
          className="rounded-b-[1.75rem] p-5 sm:p-8 lg:p-10"
        >
          <m.div initial={false} animate={active === step ? controls : undefined} className="grid gap-7 md:min-h-80 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-stretch lg:gap-12">
            <div className="flex flex-col items-start gap-4">
              <p className="kicker kicker-plain">{t("stepsKicker", { current: stepIndex + 1 })}</p>
              <h3 className="max-w-xl text-3xl leading-tight sm:text-4xl">{t(`steps.${step}.title`)}</h3>
              <p className="measure leading-relaxed text-muted-foreground sm:text-lg">{t(`steps.${step}.body`)}</p>
              <div className="mt-auto pt-2">
                {stepIndex < STEPS.length - 1 ? (
                  <Button variant="outline" data-testid={`landing-step-next-${step}`} onClick={() => {
                    const next = STEPS[stepIndex + 1]!;
                    setActive(next);
                    document.getElementById(`landing-step-${next}`)?.focus();
                  }}>
                    {t("stepsNext")}
                    <ArrowRight aria-hidden="true" />
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href={PATHS.mulai} data-testid="landing-steps-start">{t("start")}<ArrowRight aria-hidden="true" /></Link>
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-center gap-5 rounded-2xl border bg-sage-soft/40 p-5 sm:p-6">
              {step === "understand" ? (
                <>
                  <ShieldCheck aria-hidden="true" className="size-8 text-sage-ink" />
                  <p className="font-heading text-xl">{t("stepsPreviewPrepare")}</p>
                  <ul className="space-y-3 text-sm leading-relaxed">
                    {(["microAge", "microTime", "trust.account"] as const).map((key) => (
                      <li key={key} className="flex items-start gap-2.5">
                        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" /><span>{t(key)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : step === "answer" ? (
                <>
                  <p className="font-heading text-xl">{t("stepsPreviewQuestions")}</p>
                  <div aria-hidden="true" className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 21 }, (_, item) => <span key={item} className="flex aspect-square items-center justify-center rounded-lg border border-sage/70 bg-card font-heading text-sm text-sage-ink">{item + 1}</span>)}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t("stepsPreviewSafety")}</p>
                </>
              ) : (
                <>
                  <FileText aria-hidden="true" className="size-8 text-sage-ink" />
                  <p className="font-heading text-xl">{t("resultsPreviewHeading")}</p>
                  <ul className="divide-y text-sm">
                    {(["depression", "anxiety", "stress"] as const).map((subscale) => (
                      <li key={subscale} className="flex items-center justify-between gap-3 py-2.5">
                        {t(`subscales.${subscale}`)}<span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-sage" />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </m.div>
        </div>
      ))}
    </div>
  );
}

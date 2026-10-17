"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STEPS = 8;
const TENSE_SECONDS = 5;
const RELEASE_SECONDS = 10;

type Phase = { step: number; part: "tense" | "release" } | "done" | null;

/**
 * Progressive muscle relaxation (TP-07): a step-by-step text guide, with an
 * optional timer that walks through the steps. Nothing moves on screen, so
 * it works the same with reduced motion.
 */
export function PmrGuide() {
  const t = useTranslations("tips");
  const [phase, setPhase] = useState<Phase>(null);

  useEffect(() => {
    if (phase === null || phase === "done") return;
    const seconds = phase.part === "tense" ? TENSE_SECONDS : RELEASE_SECONDS;
    const timer = window.setTimeout(() => {
      if (phase.part === "tense") setPhase({ step: phase.step, part: "release" });
      else setPhase(phase.step < STEPS ? { step: phase.step + 1, part: "tense" } : "done");
    }, seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const steps = Array.from({ length: STEPS }, (_, i) => t(`pmrStep${i + 1}` as "pmrStep1"));
  const active = phase !== null && phase !== "done" ? phase.step : null;

  return (
    <div className="space-y-4" data-testid="toolkit-pmr">
      <p className="text-sm text-muted-foreground">{t("pmrIntro")}</p>
      <ol className="space-y-2">
        {steps.map((text, index) => (
          <li
            key={text}
            aria-current={active === index + 1 ? "step" : undefined}
            className="flex items-start gap-3 rounded-xl px-2 py-1.5 aria-[current=step]:bg-sky-soft"
          >
            <span className="numeral w-5 shrink-0 text-sage-ink">{index + 1}</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="min-h-6 font-medium" data-testid="pmr-status">
        {phase === "done"
          ? t("pmrDone")
          : phase
            ? `${t("pmrStepOf", { step: phase.step, total: STEPS })} · ${
                phase.part === "tense"
                  ? t("pmrTense", { seconds: TENSE_SECONDS })
                  : t("pmrRelease", { seconds: RELEASE_SECONDS })
              }`
            : null}
      </p>
      {phase === null || phase === "done" ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setPhase({ step: 1, part: "tense" })}
          data-testid="pmr-start"
        >
          {t("pmrStart")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setPhase(null)}
          data-testid="pmr-stop"
        >
          {t("pmrStop")}
        </Button>
      )}
    </div>
  );
}

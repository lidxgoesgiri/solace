"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "@/components/icons/arrow-right";
import { Coffee } from "@/components/icons/coffee";
import { Ear } from "@/components/icons/ear";
import { Eye } from "@/components/icons/eye";
import { Flower2 } from "@/components/icons/flower-2";
import { Hand } from "@/components/icons/hand";
import { RotateCcwClock } from "@/components/icons/rotate-ccw-clock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Eye, key: "groundingSee" },
  { icon: Hand, key: "groundingTouch" },
  { icon: Ear, key: "groundingHear" },
  { icon: Flower2, key: "groundingSmell" },
  { icon: Coffee, key: "groundingTaste" },
] as const;

/** A self-paced guide using the same instructions as the crisis screen. No answers are stored. */
export function GroundingPreview() {
  const t = useTranslations("landing");
  const crisis = useTranslations("crisis");
  const [active, setActive] = useState(0);
  const panelId = useId();
  const step = STEPS[active]!;
  const Icon = step.icon;
  const last = active === STEPS.length - 1;

  return (
    <div className="surface flex h-full flex-col gap-6 p-4 sm:p-7" data-testid="landing-grounding">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sage-soft text-sage-ink">
          <Hand aria-hidden="true" className="size-5" />
        </span>
        <h3 className="text-2xl">{t("groundingTitle")}</h3>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("groundingBody")}</p>
      <div role="group" aria-label={t("groundingLabel")} className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {STEPS.map(({ key, icon: SenseIcon }, index) => (
          <button
            key={key}
            type="button"
            aria-label={crisis(key)}
            aria-pressed={active === index}
            aria-controls={panelId}
            data-testid={`grounding-step-${5 - index}`}
            onClick={() => setActive(index)}
            className={cn(
              "flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 transition-colors",
              active === index ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-sage-ink hover:bg-sage-soft",
            )}
          >
            <span aria-hidden="true" className="numeral text-xl">{5 - index}</span>
            <SenseIcon aria-hidden="true" className="size-4" />
          </button>
        ))}
      </div>
      <div id={panelId} aria-live="polite" aria-atomic="true" className="flex flex-1 items-center gap-4 rounded-2xl bg-sage-soft/60 p-5" data-testid="grounding-current-step">
        <Icon aria-hidden="true" className="size-7 shrink-0 text-sage-ink" />
        <p className="font-heading text-xl leading-relaxed">{crisis(step.key)}</p>
      </div>
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs leading-relaxed text-muted-foreground">{t("groundingPace")}</p>
        <Button variant="outline" className="w-full" data-testid="grounding-next" onClick={() => setActive(last ? 0 : active + 1)}>
          {t(last ? "groundingRestart" : "groundingNext")}
          {last ? <RotateCcwClock aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}

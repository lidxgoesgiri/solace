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
import { Wind } from "@/components/icons/wind";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: Eye, key: "groundingSee" },
  { icon: Hand, key: "groundingTouch" },
  { icon: Ear, key: "groundingHear" },
  { icon: Flower2, key: "groundingSmell" },
  { icon: Coffee, key: "groundingTaste" },
] as const;

export function GroundingPreview() {
  const t = useTranslations("landing");
  const crisis = useTranslations("crisis");
  const [active, setActive] = useState(0);
  const panelId = useId();
  const step = STEPS[active]!;
  const Icon = step.icon;
  const last = active === STEPS.length - 1;

  return (
    <div
      data-testid="landing-grounding"
      className="surface landing-lift relative flex h-full min-h-[22rem] flex-col justify-between gap-6 rounded-[1.75rem] border border-border/80 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-soft sm:p-8"
    >
      {/* Top Header matching Image 2 */}
      <div className="space-y-3.5">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-sage-soft text-sage-ink">
          <Wind aria-hidden="true" className="size-5" />
        </div>
        <h3 className="font-heading text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          {t("groundingTitle")}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("groundingBody")}
        </p>
      </div>

      {/* 5 Big Minimalist Number Tiles (Image 2 aesthetic) */}
      <div
        role="group"
        aria-label={t("groundingLabel")}
        className="grid grid-cols-5 gap-2 sm:gap-2.5"
      >
        {STEPS.map(({ key }, index) => {
          const isSelected = active === index;
          return (
            <button
              key={key}
              type="button"
              aria-label={crisis(key)}
              aria-pressed={isSelected}
              aria-controls={panelId}
              data-testid={`grounding-step-${5 - index}`}
              onClick={() => setActive(index)}
              className={cn(
                "flex aspect-square min-h-12 sm:min-h-14 items-center justify-center rounded-2xl border font-heading text-xl sm:text-2xl transition-all duration-200 cursor-pointer select-none",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs scale-105"
                  : "border-border/70 bg-muted/40 text-foreground hover:bg-card hover:border-border",
              )}
            >
              <span aria-hidden="true">{5 - index}</span>
            </button>
          );
        })}
      </div>

      {/* Active Sensory Prompt */}
      <div
        id={panelId}
        aria-live="polite"
        aria-atomic="true"
        data-testid="grounding-current-step"
        className="flex items-center gap-3.5 rounded-2xl border border-sage-ink/20 bg-sage-soft/40 p-4 transition-all duration-300"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card/80 text-sage-ink">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <p className="font-heading text-base font-medium text-foreground sm:text-lg">
          {crisis(step.key)}
        </p>
      </div>

      {/* Next Step Action Button */}
      <Button
        variant="outline"
        className="w-full rounded-xl cursor-pointer py-2.5 text-sm"
        data-testid="grounding-next"
        onClick={() => setActive(last ? 0 : active + 1)}
      >
        {t(last ? "groundingRestart" : "groundingNext")}
        {last ? (
          <RotateCcwClock aria-hidden="true" className="ml-2 size-4" />
        ) : (
          <ArrowRight aria-hidden="true" className="ml-2 size-4" />
        )}
      </Button>
    </div>
  );
}

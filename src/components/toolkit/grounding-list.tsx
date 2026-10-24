"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "@/components/icons/check";
import { Coffee } from "@/components/icons/coffee";
import { Ear } from "@/components/icons/ear";
import { Eye } from "@/components/icons/eye";
import { Flower2 } from "@/components/icons/flower-2";
import { Hand } from "@/components/icons/hand";
import { cn } from "@/lib/utils";

/** 5-4-3-2-1 grounding (TP-06), shared by the crisis screen and the toolkit with interactive sensory check-off. */
export function GroundingList() {
  const t = useTranslations("crisis");
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  const steps = [
    { icon: Eye, text: t("groundingSee"), num: 5 },
    { icon: Hand, text: t("groundingTouch"), num: 4 },
    { icon: Ear, text: t("groundingHear"), num: 3 },
    { icon: Flower2, text: t("groundingSmell"), num: 2 },
    { icon: Coffee, text: t("groundingTaste"), num: 1 },
  ];

  const toggle = (i: number) => {
    setCompleted((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <ol className="divide-y divide-border/70 select-none">
      {steps.map(({ icon: Icon, text, num }, index) => {
        const isDone = Boolean(completed[index]);
        return (
          <li
            key={text}
            onClick={() => toggle(index)}
            className="group flex cursor-pointer items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0 transition-colors hover:bg-muted/40 rounded-xl px-2.5 -mx-2.5"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-200",
                  isDone
                    ? "bg-primary text-primary-foreground scale-105 shadow-xs"
                    : "bg-sage-soft text-sage-ink group-hover:scale-105",
                )}
              >
                {isDone ? <Check className="size-4 animate-check-in" strokeWidth={3} /> : <Icon aria-hidden="true" className="size-4" />}
              </span>
              <span className={cn("text-sm leading-relaxed transition-colors", isDone && "line-through text-muted-foreground")}>
                {text}
              </span>
            </div>
            <span className="numeral text-xs font-medium text-muted-foreground">
              0{num}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

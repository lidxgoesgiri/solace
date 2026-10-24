"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Check } from "@/components/icons/check";
import { GROUNDING_STEPS } from "@/components/toolkit/grounding-list";
import { cn } from "@/lib/utils";

/**
 * 5-4-3-2-1 grounding (TP-06) for the toolkit on /tips: each sense is a
 * toggle button, so it can be ticked off with a pointer or the keyboard.
 */
export function GroundingChecklist() {
  const t = useTranslations("crisis");
  const [done, setDone] = useState<ReadonlySet<number>>(() => new Set());

  const toggle = (count: number) =>
    setDone((previous) => {
      const next = new Set(previous);
      if (!next.delete(count)) next.add(count);
      return next;
    });

  return (
    <ol className="divide-y divide-border/70">
      {GROUNDING_STEPS.map(({ icon: Icon, key, count }) => {
        const isDone = done.has(count);
        return (
          <li key={key} className="py-1 first:pt-0 last:pb-0">
            <button
              type="button"
              aria-pressed={isDone}
              data-testid={`grounding-check-${count}`}
              onClick={() => toggle(count)}
              className="group -mx-2.5 flex w-[calc(100%+1.25rem)] cursor-pointer items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors select-none hover:bg-muted/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-200",
                    isDone
                      ? "scale-105 bg-primary text-primary-foreground shadow-xs"
                      : "bg-sage-soft text-sage-ink group-hover:scale-105",
                  )}
                >
                  {isDone ? (
                    <Check aria-hidden="true" className="size-4 animate-check-in" strokeWidth={3} />
                  ) : (
                    <Icon aria-hidden="true" className="size-4" />
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm leading-relaxed transition-colors",
                    isDone && "text-muted-foreground line-through",
                  )}
                >
                  {t(key)}
                </span>
              </span>
              <span aria-hidden="true" className="numeral text-xs font-medium text-muted-foreground">
                0{count}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

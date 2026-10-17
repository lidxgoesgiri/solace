"use client";

import { m } from "framer-motion";
import { Check } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { DURATION, EASE_CALM } from "@/components/motion/tokens";
import { cn } from "@/lib/utils";
import type { AnswerOption } from "@/lib/content";
import type { AnswerValue } from "@/lib/scoring";

interface AnswerOptionsProps {
  options: AnswerOption[];
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
  /** Produces data-testid `${testIdPrefix}-${value}`. */
  testIdPrefix: "answer-option" | "safety-answer";
  "aria-labelledby": string;
  "aria-describedby"?: string;
}

/**
 * Four large radio cards. Click, touch, arrow keys, or keys 1–4 select an
 * answer; the selected card shows a check icon, not only a colour change.
 */
export function AnswerOptions({
  options,
  value,
  onChange,
  testIdPrefix,
  ...aria
}: AnswerOptionsProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value === null ? "" : String(value)}
      onValueChange={(next) => onChange(Number(next) as AnswerValue)}
      className="grid gap-2.5"
      {...aria}
    >
      {options.map((option, index) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={String(option.value)}
          data-testid={`${testIdPrefix}-${option.value}`}
          className={cn(
            "group flex min-h-15 w-full cursor-pointer items-center gap-4 rounded-2xl border bg-card px-4 py-3.5 text-left text-base sm:px-5",
            "transition-[border-color,background-color,box-shadow,transform] duration-(--duration-quick) ease-(--ease-calm)",
            "hover:border-input hover:shadow-(--shadow-soft) active:scale-[0.995]",
            "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
            "data-[state=checked]:border-primary data-[state=checked]:bg-secondary data-[state=checked]:shadow-(--shadow-soft)",
          )}
        >
          <kbd
            aria-hidden="true"
            className="numeral flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-base text-muted-foreground transition-colors duration-(--duration-quick) group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground"
          >
            {index + 1}
          </kbd>
          <span className="flex-1 leading-snug">{option.label}</span>
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-input transition-colors duration-(--duration-quick) group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary"
          >
            <RadioGroupPrimitive.Indicator asChild>
              <m.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: DURATION.quick, ease: EASE_CALM }}
                className="flex"
              >
                <Check className="size-4 text-primary-foreground" strokeWidth={3} />
              </m.span>
            </RadioGroupPrimitive.Indicator>
          </span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

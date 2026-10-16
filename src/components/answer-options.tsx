"use client";

import { Check } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
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
      className="grid gap-3"
      {...aria}
    >
      {options.map((option, index) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={String(option.value)}
          data-testid={`${testIdPrefix}-${option.value}`}
          className={cn(
            "group flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-border bg-card px-4 py-3 text-left text-base transition-colors",
            "hover:border-primary/60 hover:bg-secondary/60",
            "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
            "data-[state=checked]:border-primary data-[state=checked]:bg-secondary",
          )}
        >
          <kbd
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-input bg-muted font-sans text-sm font-semibold group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground"
          >
            {index + 1}
          </kbd>
          <span className="flex-1">{option.label}</span>
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-input group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary"
          >
            <RadioGroupPrimitive.Indicator>
              <Check className="size-4 text-primary-foreground" strokeWidth={3} />
            </RadioGroupPrimitive.Indicator>
          </span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

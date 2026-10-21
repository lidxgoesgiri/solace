"use client";

import { Check } from "@/components/icons/check";
import { RadioGroup, RadioItem } from "@/components/ui/radio-cards";
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

const itemClass = [
  "group flex min-h-15 w-full cursor-pointer items-center gap-3 rounded-2xl border bg-card px-3.5 py-3.5 text-left text-base sm:gap-4 sm:px-5",
  "transition-[border-color,background-color,box-shadow,transform] duration-(--duration-quick) ease-(--ease-calm)",
  "hover:border-input hover:shadow-(--shadow-soft) active:scale-[0.995]",
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "data-[state=checked]:border-primary data-[state=checked]:bg-secondary data-[state=checked]:shadow-(--shadow-soft)",
].join(" ");

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
    <RadioGroup
      value={value === null ? "" : String(value)}
      values={options.map((option) => String(option.value))}
      onValueChange={(next) => onChange(Number(next) as AnswerValue)}
      className="grid gap-2.5"
      {...aria}
    >
      {options.map((option, index) => (
        <RadioItem
          key={option.value}
          value={String(option.value)}
          data-testid={`${testIdPrefix}-${option.value}`}
          className={itemClass}
        >
          <kbd
            aria-hidden="true"
            className="numeral flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-base text-muted-foreground transition-colors duration-(--duration-quick) group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground"
          >
            {index + 1}
          </kbd>
          <span className="min-w-0 flex-1 leading-relaxed">{option.label}</span>
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-input transition-colors duration-(--duration-quick) group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary"
          >
            {value === option.value ? (
              <Check className="size-4 animate-check-in text-primary-foreground" strokeWidth={3} />
            ) : null}
          </span>
        </RadioItem>
      ))}
    </RadioGroup>
  );
}

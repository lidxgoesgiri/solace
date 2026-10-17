"use client";

import { Check } from "@/components/icons";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<
  ComponentProps<"button">,
  "type" | "role" | "onClick" | "value"
> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * Accessible checkbox: a button with role="checkbox" and aria-checked, the
 * same contract (and data-state) as the Radix checkbox it replaces, without
 * its JavaScript. A <label htmlFor> pointing at its id toggles it too.
 */
export function Checkbox({ checked, onCheckedChange, className, ...props }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "peer relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 border-input bg-card text-primary-foreground transition-colors duration-(--duration-quick)",
        "after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      {checked ? (
        <Check aria-hidden="true" className="size-3.5 animate-check-in" strokeWidth={3} />
      ) : null}
    </button>
  );
}

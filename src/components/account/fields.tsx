"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "@/components/icons";
import { passphraseStrength, type PassphraseStrength } from "@/lib/account/passphrase";
import { cn } from "@/lib/utils";

export const inputClass =
  "block min-h-11 w-full rounded-xl border border-input bg-card px-3.5 text-base transition-colors hover:border-ink/60 aria-invalid:border-destructive";

interface TextFieldProps extends Omit<ComponentProps<"input">, "id" | "className"> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
}

/** A labelled input with its hint and error right below it. */
export function TextField({ label, hint, error, className, ...input }: TextFieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        className={inputClass}
        {...input}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const STRENGTH_LEVEL: Record<PassphraseStrength, number> = {
  too_short: 0,
  weak: 1,
  fair: 2,
  strong: 3,
};

interface PassphraseFieldProps extends Omit<TextFieldProps, "type"> {
  /** Show the strength meter (for new passphrases). */
  showStrength?: boolean;
  testId: string;
}

/** Passphrase input with a show/hide toggle and an optional strength meter (AK-01). */
export function PassphraseField({
  showStrength = false,
  testId,
  value,
  ...props
}: PassphraseFieldProps) {
  const t = useTranslations("account");
  const [visible, setVisible] = useState(false);
  const strength = passphraseStrength(String(value ?? ""));
  const level = STRENGTH_LEVEL[strength];

  return (
    <div className="space-y-2">
      <div className="relative">
        <TextField
          {...props}
          value={value}
          type={visible ? "text" : "password"}
          autoComplete={props.autoComplete ?? "current-password"}
          spellCheck={false}
          data-testid={testId}
          className="[&_input]:pr-12"
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? t("hidePassphrase") : t("showPassphrase")}
          aria-pressed={visible}
          className="absolute top-[1.85rem] right-1 flex size-10 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
      {showStrength && String(value ?? "").length > 0 ? (
        <div
          className="flex items-center gap-3"
          data-testid={`${testId}-strength`}
          data-strength={strength}
        >
          <div aria-hidden="true" className="flex gap-1">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={cn(
                  "h-1.5 w-8 rounded-full",
                  level >= step
                    ? level === 3
                      ? "bg-sage-ink"
                      : level === 2
                        ? "bg-primary"
                        : "bg-sun-edge"
                    : "bg-ink/10",
                )}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("strength.label", { level: t(`strength.${strength}`) })}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** A status line for a form: errors read out by screen readers. */
export function FormMessage({
  tone,
  children,
  testId,
}: {
  tone: "error" | "info";
  children: ReactNode;
  testId?: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      data-testid={testId}
      className={cn(
        "rounded-2xl border p-4 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-card text-destructive"
          : "border-sage bg-sage-soft text-ink",
      )}
    >
      {children}
    </p>
  );
}

/**
 * The current value of a field in a submitted form, read from the DOM. If
 * someone typed before the page finished loading, React state can still be
 * empty while the field shows text; the DOM is the truth at submit time.
 * (Fields deliberately have no `name`, so a submit before hydration sends
 * nothing anywhere.)
 */
export function fieldValue(form: HTMLFormElement, testId: string, fallback: string): string {
  const input = form.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`);
  return input ? input.value : fallback;
}

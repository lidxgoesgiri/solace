"use client";

import { ArrowRight } from "@/components/icons/arrow-right";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { HelpDirectory } from "@/components/help-directory";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioItem } from "@/components/ui/radio-cards";
import { useRouter } from "@/i18n/navigation";
import { trackEvent } from "@/lib/metrics-client";
import { firstUnansweredItem, hasDraft, isScreeningFinished, resumePath } from "@/lib/flow";
import { cn } from "@/lib/utils";
import { useFlow, useFlowDispatch, useFlowHydrated, useFlowStore } from "@/store/flow-store";

const AGE_CHOICES = ["adult", "minor"] as const;
type AgeChoice = (typeof AGE_CHOICES)[number];

const ageCardClass = cn(
  "group flex min-h-14 w-full cursor-pointer items-center gap-3.5 rounded-2xl border bg-card px-5 py-3.5 text-left text-base",
  "transition-[border-color,background-color,box-shadow] duration-(--duration-quick) ease-(--ease-calm)",
  "hover:border-input hover:shadow-(--shadow-soft)",
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
  "data-[state=checked]:border-primary data-[state=checked]:bg-secondary data-[state=checked]:shadow-(--shadow-soft)",
);

const radioDotClass =
  "flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-input transition-colors group-data-[state=checked]:border-primary";

/** Age confirmation (LO-04) and consent (LO-05) before the first question. */
export function StartForm() {
  const t = useTranslations("start");
  const router = useRouter();
  const hydrated = useFlowHydrated();
  const flow = useFlow();
  const dispatch = useFlowDispatch();
  const [age, setAge] = useState<AgeChoice | null>(null);
  const [consent, setConsent] = useState(false);

  const canBegin = age === "adult" && consent;
  const draftQuestion = hydrated && hasDraft(flow) ? firstUnansweredItem(flow) : null;
  const willReplace = hydrated && isScreeningFinished(flow);

  const begin = () => {
    if (!canBegin) return;
    dispatch({ type: "BEGIN_SCREENING", at: new Date().toISOString() });
    trackEvent("screening_started");
    router.push(resumePath(useFlowStore.getState().flow));
  };

  return (
    <div className="space-y-8">
      <fieldset className="space-y-3">
        <legend id="age-legend" className="mb-4 font-heading text-2xl">
          {t("ageLegend")}
        </legend>
        <RadioGroup
          aria-labelledby="age-legend"
          value={age ?? ""}
          values={AGE_CHOICES}
          onValueChange={(value) => setAge(value as AgeChoice)}
          className="grid gap-3 sm:grid-cols-2"
        >
          {AGE_CHOICES.map((choice) => (
            <RadioItem
              key={choice}
              value={choice}
              data-testid={`age-${choice}`}
              className={ageCardClass}
            >
              <span className={radioDotClass}>
                {age === choice ? (
                  <span className="size-2.5 animate-check-in rounded-full bg-primary" />
                ) : null}
              </span>
              {choice === "adult" ? t("ageAdult") : t("ageMinor")}
            </RadioItem>
          ))}
        </RadioGroup>
      </fieldset>

      {age === "minor" ? (
        <section
          data-testid="under-18-panel"
          aria-labelledby="minor-title"
          aria-live="polite"
          className="animate-rise-in space-y-4 rounded-2xl border border-sun-edge/60 bg-sun-soft p-6 sm:p-8"
        >
          <h2 id="minor-title" className="text-2xl">
            {t("minorTitle")}
          </h2>
          <p>{t("minorBody")}</p>
          <p>{t("minorHelp")}</p>
          <HelpDirectory />
        </section>
      ) : null}

      {age === "adult" ? (
        <div className="animate-rise-in space-y-6">
          <div className="surface flex items-start gap-3.5 p-5">
            <Checkbox
              id="consent"
              data-testid="consent-checkbox"
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="consent" className="text-base leading-snug">
              {t("consentLabel")}
            </label>
          </div>

          {willReplace ? (
            <p
              className="rounded-2xl border border-sun-edge/60 bg-sun-soft p-4 text-sm"
              data-testid="replace-warning"
            >
              {t("replaceWarning")}
            </p>
          ) : null}

          <div className="space-y-2">
            <Button
              type="button"
              size="lg"
              data-testid="begin-screening"
              disabled={!canBegin}
              aria-describedby={canBegin ? undefined : "begin-requirements"}
              onClick={begin}
              className="w-full sm:w-auto"
            >
              {draftQuestion ? t("resume", { question: draftQuestion }) : t("begin")}
              <ArrowRight aria-hidden="true" />
            </Button>
            {canBegin ? null : (
              <p id="begin-requirements" className="text-sm text-muted-foreground">
                {t("requirements")}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

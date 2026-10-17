"use client";

import { ArrowLeft, ArrowRight, ShieldCheck } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { AnswerOptions } from "@/components/answer-options";
import { Button } from "@/components/ui/button";
import { useAnswerKeys } from "@/hooks/use-answer-keys";
import { useRouter } from "@/i18n/navigation";
import type { AnswerOption, Locale } from "@/lib/content";
import { PATHS, pathAfterSafety } from "@/lib/flow";
import type { AnswerValue } from "@/lib/scoring";
import { useFlow, useFlowDispatch, useFlowStore } from "@/store/flow-store";

/**
 * PHQ-9 item 9 after item 21 (SK-08, PRD 9.1). Cannot be skipped: the results
 * route requires an answer, and any answer above 0 opens the crisis screen.
 */
export function SafetyQuestion({
  locale,
  stem,
  text,
  isPlaceholder,
  options,
}: {
  /** Language of the question text, saved with the answer. */
  locale: Locale;
  stem: string;
  text: string;
  /** True while the text is a TODO(verify) placeholder. */
  isPlaceholder: boolean;
  options: AnswerOption[];
}) {
  const t = useTranslations("safety");
  const screening = useTranslations("screening");
  const router = useRouter();
  const flow = useFlow();
  const dispatch = useFlowDispatch();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [selected, setSelected] = useState<AnswerValue | null>(flow.safetyAnswer);

  // PRD 9.5: a gentle check when a positive answer is changed to 0.
  const showWithdrawNote = flow.safetyEverPositive && selected === 0;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const submit = () => {
    if (selected === null) return;
    dispatch({
      type: "ANSWER_SAFETY",
      value: selected,
      at: new Date().toISOString(),
      locale,
    });
    router.push(pathAfterSafety(useFlowStore.getState().flow));
  };

  useAnswerKeys({ onSelect: setSelected, onSubmit: submit });

  return (
    <div className="mx-auto max-w-2xl space-y-8" data-testid="safety-question">
      <header className="space-y-4">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-4xl leading-tight outline-none sm:text-5xl"
        >
          {t("title")}
        </h1>
        <p id="safety-intro" className="flex items-start gap-3 rounded-2xl bg-sky-soft p-4 sm:p-5">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>{t("intro")}</span>
        </p>
      </header>

      <div className="space-y-4">
        <p className="text-sm font-semibold text-sage-ink">{t("period")}</p>
        <p className="text-muted-foreground">{stem}</p>
        <p
          id="safety-text"
          data-testid="safety-text"
          className="font-heading text-[1.6rem] leading-snug sm:text-3xl"
        >
          {text}
        </p>
        {isPlaceholder ? (
          <p
            className="rounded-xl border border-sun-edge/60 bg-sun-soft p-3 text-xs"
            data-testid="placeholder-notice"
          >
            {screening("placeholderNotice")}
          </p>
        ) : null}
      </div>

      <AnswerOptions
        options={options}
        value={selected}
        onChange={setSelected}
        testIdPrefix="safety-answer"
        aria-labelledby="safety-text"
        aria-describedby="safety-intro"
      />

      {showWithdrawNote ? (
        <div
          role="status"
          data-testid="safety-withdraw-note"
          className="animate-rise-in space-y-1.5 rounded-2xl border border-sky bg-sky-soft p-5"
        >
          <p className="font-semibold">{t("withdrawTitle")}</p>
          <p className="text-sm">{t("withdrawBody")}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <Button
          type="button"
          variant="ghost"
          data-testid="prev-question"
          onClick={() => router.push(PATHS.question(21))}
        >
          <ArrowLeft aria-hidden="true" />
          {t("previous")}
        </Button>
        <Button
          type="button"
          size="lg"
          data-testid="safety-submit"
          disabled={selected === null}
          onClick={submit}
        >
          {t("submit")}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

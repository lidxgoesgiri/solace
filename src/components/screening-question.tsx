"use client";

import { ArrowLeft } from "@/components/icons/arrow-left";
import { ArrowRight } from "@/components/icons/arrow-right";
import { Check } from "@/components/icons/check";
import { Pause } from "@/components/icons/pause";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnswerOptions } from "@/components/answer-options";
import { Button } from "@/components/ui/button";
import { useAnswerKeys } from "@/hooks/use-answer-keys";
import { Link, useRouter } from "@/i18n/navigation";
import type { AnswerOption } from "@/lib/content";
import { PATHS } from "@/lib/flow";
import { DASS21_ITEM_COUNT, type AnswerValue } from "@/lib/answers";
import { useFlow, useFlowDispatch } from "@/store/flow-store";

// Where the bar stood on the previous question, so it grows from there.
let lastProgress: number | null = null;

/**
 * One DASS-21 item per screen with progress (SK-01–SK-05, SK-07). Answers are
 * stored by item number, so switching language keeps them (K9).
 */
export function ScreeningQuestion({
  n,
  text,
  isPlaceholder,
  options,
}: {
  n: number;
  /** Item text in the page language; null when `n` is not an item. */
  text: string | null;
  /** True while the text is a TODO(verify) placeholder. */
  isPlaceholder: boolean;
  options: AnswerOption[];
}) {
  const t = useTranslations("screening");
  const router = useRouter();
  const flow = useFlow();
  const dispatch = useFlowDispatch();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const selected = flow.answers[n - 1] ?? null;
  const isLast = n === DASS21_ITEM_COUNT;

  const progress = n / DASS21_ITEM_COUNT;
  const [progressFrom] = useState(() => lastProgress ?? progress);

  // Move focus to the new question so screen readers announce it.
  useEffect(() => {
    headingRef.current?.focus();
    lastProgress = progress;
  }, [n, progress]);

  const goNext = () => {
    if (selected === null) return;
    router.push(isLast ? PATHS.keamanan : PATHS.question(n + 1));
  };

  const goPrevious = () => {
    router.push(n > 1 ? PATHS.question(n - 1) : PATHS.mulai);
  };

  // The timestamp drives the 7-day draft expiry (SK-06).
  const answer = (value: AnswerValue) =>
    dispatch({ type: "ANSWER_ITEM", item: n, value, at: new Date().toISOString() });

  useAnswerKeys({
    onSelect: (value) => answer(value),
    onSubmit: goNext,
  });

  if (text === null) return null;

  return (
    <div
      className="mx-auto max-w-3xl space-y-7 sm:space-y-8"
      data-testid="screening-question"
      data-question={n}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span
            data-testid="progress"
            aria-hidden="true"
            className="numeral shrink-0 text-lg whitespace-nowrap"
          >
            {t("progress", { current: n, total: DASS21_ITEM_COUNT })}
          </span>
          <span className="inline-flex min-w-0 items-start gap-2 text-xs leading-relaxed text-muted-foreground sm:text-sm" data-testid="screening-save-status">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
            <span>{t(selected === null ? "autosaveHint" : "autosaved")}</span>
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={t("progressLabel", { current: n, total: DASS21_ITEM_COUNT })}
          aria-valuemin={1}
          aria-valuemax={DASS21_ITEM_COUNT}
          aria-valuenow={n}
          className="h-1.5 overflow-hidden rounded-full bg-ink/10"
        >
          <div
            className="h-full origin-left animate-grow rounded-full bg-primary"
            style={{ "--grow-from": progressFrom, "--grow-to": progress } as CSSProperties}
          />
        </div>
      </div>

      <div className="space-y-4">
        <p className="kicker">{t("period")}</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          id="question-text"
          data-testid="question-text"
          className="text-[1.75rem] leading-snug outline-none sm:text-[2.1rem]"
        >
          <span className="sr-only">
            {t("progressLabel", { current: n, total: DASS21_ITEM_COUNT })}.{" "}
          </span>
          {text}
        </h1>
        <p id="question-instructions" className="text-muted-foreground">
          {t("instructions")}
        </p>
        {isPlaceholder ? (
          <p
            className="rounded-xl border border-sun-edge/60 bg-sun-soft p-3 text-xs"
            data-testid="placeholder-notice"
          >
            {t("placeholderNotice")}
          </p>
        ) : null}
      </div>

      <AnswerOptions
        options={options}
        value={selected}
        onChange={answer}
        testIdPrefix="answer-option"
        aria-labelledby="question-text"
        aria-describedby="question-instructions"
      />

      <div className="space-y-4 border-t pt-5">
        <p role="status" data-testid="answer-feedback" className="min-h-6 text-sm leading-relaxed text-muted-foreground">
          {t(selected === null ? "chooseToContinue" : "answerSelected")}
        </p>
        <div className="grid grid-cols-2 items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
          <Button
            type="button"
            variant="ghost"
            data-testid="prev-question"
            onClick={goPrevious}
            className="max-sm:px-3"
          >
            <ArrowLeft aria-hidden="true" />
            {t("previous")}
          </Button>
          <Button
            type="button"
            size="lg"
            data-testid="next-question"
            disabled={selected === null}
            onClick={goNext}
            className="w-full justify-self-end max-sm:px-3 max-sm:text-sm sm:w-auto"
          >
            {isLast ? t("toSafety") : t("next")}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <Link
            href={PATHS.landing}
            data-testid="pause-screening"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 transition-colors hover:bg-muted hover:text-foreground max-sm:px-3"
          >
            <Pause aria-hidden="true" className="size-4" />
            {t("pause")}
          </Link>
          <p className="hidden text-xs sm:block">{t("keyboardHint")}</p>
        </div>
      </div>
    </div>
  );
}

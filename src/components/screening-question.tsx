"use client";

import { ArrowLeft, ArrowRight, Check } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnswerOptions } from "@/components/answer-options";
import { Button } from "@/components/ui/button";
import { useAnswerKeys } from "@/hooks/use-answer-keys";
import { useRouter } from "@/i18n/navigation";
import type { AnswerOption } from "@/lib/content";
import { PATHS } from "@/lib/flow";
import { DASS21_ITEM_COUNT, type AnswerValue } from "@/lib/scoring";
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

  const answer = (value: AnswerValue) => dispatch({ type: "ANSWER_ITEM", item: n, value });

  useAnswerKeys({
    onSelect: (value) => answer(value),
    onSubmit: goNext,
  });

  if (text === null) return null;

  return (
    <div
      className="mx-auto max-w-2xl space-y-8"
      data-testid="screening-question"
      data-question={n}
    >
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <span
            data-testid="progress"
            aria-hidden="true"
            className="numeral shrink-0 text-lg whitespace-nowrap"
          >
            {t("progress", { current: n, total: DASS21_ITEM_COUNT })}
          </span>
          <span className="flex items-center gap-1.5 text-right text-sm text-muted-foreground">
            <Check aria-hidden="true" className="size-4 text-sage-ink" />
            {t("autosaved")}
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <Button
          type="button"
          variant="ghost"
          data-testid="prev-question"
          onClick={goPrevious}
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
        >
          {isLast ? t("toSafety") : t("next")}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
      <p className="hidden text-center text-sm text-muted-foreground sm:block">
        {t("keyboardHint")}
      </p>
    </div>
  );
}

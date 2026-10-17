"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { AnswerOptions } from "@/components/answer-options";
import { Button } from "@/components/ui/button";
import { useAnswerKeys } from "@/hooks/use-answer-keys";
import { useRouter } from "@/i18n/navigation";
import type { AnswerOption } from "@/lib/content";
import { PATHS } from "@/lib/flow";
import { DASS21_ITEM_COUNT } from "@/lib/scoring";
import { useFlow, useFlowDispatch } from "@/store/flow-store";

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

  // Move focus to the new question so screen readers announce it.
  useEffect(() => {
    headingRef.current?.focus();
  }, [n]);

  const goNext = () => {
    if (selected === null) return;
    router.push(isLast ? PATHS.keamanan : PATHS.question(n + 1));
  };

  const goPrevious = () => {
    router.push(n > 1 ? PATHS.question(n - 1) : PATHS.mulai);
  };

  useAnswerKeys({
    onSelect: (value) => dispatch({ type: "ANSWER_ITEM", item: n, value }),
    onSubmit: goNext,
  });

  if (text === null) return null;

  return (
    <div className="space-y-6" data-testid="screening-question" data-question={n}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm font-medium">
          <span data-testid="progress" aria-hidden="true" className="shrink-0 whitespace-nowrap">
            {t("progress", { current: n, total: DASS21_ITEM_COUNT })}
          </span>
          <span className="flex items-center gap-1 text-right text-muted-foreground">
            <Check aria-hidden="true" className="size-4" />
            {t("autosaved")}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={t("progressLabel", { current: n, total: DASS21_ITEM_COUNT })}
          aria-valuemin={1}
          aria-valuemax={DASS21_ITEM_COUNT}
          aria-valuenow={n}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${(n / DASS21_ITEM_COUNT) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
          {t("period")}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          id="question-text"
          data-testid="question-text"
          className="text-2xl leading-snug outline-none sm:text-3xl"
        >
          <span className="sr-only">
            {t("progressLabel", { current: n, total: DASS21_ITEM_COUNT })}.{" "}
          </span>
          {text}
        </h1>
        <p id="question-instructions" className="text-sm text-muted-foreground">
          {t("instructions")}
        </p>
        {isPlaceholder ? (
          <p className="rounded-lg bg-sun-soft p-3 text-xs" data-testid="placeholder-notice">
            {t("placeholderNotice")}
          </p>
        ) : null}
      </div>

      <AnswerOptions
        options={options}
        value={selected}
        onChange={(value) => dispatch({ type: "ANSWER_ITEM", item: n, value })}
        testIdPrefix="answer-option"
        aria-labelledby="question-text"
        aria-describedby="question-instructions"
      />

      <p className="hidden text-sm text-muted-foreground sm:block">{t("keyboardHint")}</p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
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
    </div>
  );
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { BookOpen } from "@/components/icons/book-open";
import { Check } from "@/components/icons/check";
import { ExternalLink } from "@/components/icons/external-link";
import { isLocale, isTodoPlaceholder } from "@/lib/content";
import type { Tip } from "@/lib/tips";
import { cn } from "@/lib/utils";

export interface TipProgress {
  tried: boolean;
  helpful: "yes" | "no" | null;
}

interface TipCardProps {
  tip: Tip;
  progress: TipProgress;
  onProgress: (next: TipProgress) => void;
}

const toggleClass =
  "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors aria-pressed:border-primary aria-pressed:bg-secondary";

/** One tip with its steps, its sources (TP-02), and the tried/helpful note (TP-04). */
export function TipCard({ tip, progress, onProgress }: TipCardProps) {
  const t = useTranslations("tips");
  const common = useTranslations("common");
  const appLocale = useLocale();
  const locale = isLocale(appLocale) ? appLocale : "id";
  const summary = tip.evidence.summary[locale];
  const titleId = `tip-${tip.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      data-testid={`tip-card-${tip.id}`}
      className="surface space-y-5 p-6 sm:p-7"
    >
      <header className="space-y-2">
        <h3 id={titleId} className="text-2xl">
          {tip.title[locale]}
        </h3>
        <p className="measure leading-relaxed text-muted-foreground">{tip.body[locale]}</p>
        {tip.reviewedAt === null ? (
          <p
            className="inline-flex rounded-full border border-sun-edge/60 bg-sun-soft px-3 py-0.5 text-xs font-medium"
            data-testid={`tip-review-pending-${tip.id}`}
          >
            {t("reviewPending")}
          </p>
        ) : null}
      </header>

      <section aria-label={t("howToTitle")} className="space-y-2">
        <h4 className="text-sm font-semibold">{t("howToTitle")}</h4>
        <ol className="space-y-2">
          {tip.howTo[locale].map((step, index) => (
            <li key={step} className="flex gap-3">
              <span aria-hidden="true" className="numeral w-5 shrink-0 text-sage-ink">
                {index + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="space-y-2 rounded-2xl bg-muted/60 p-4 text-sm"
        data-testid={`tip-evidence-${tip.id}`}
      >
        <h4 className="flex items-center gap-2 font-semibold">
          <BookOpen aria-hidden="true" className="size-4 text-sage-ink" />
          {t("evidenceTitle")}
        </h4>
        <p>{t(`evidenceLevel.${tip.evidenceLevel}`)}</p>
        <p className="text-muted-foreground">
          {isTodoPlaceholder(summary) ? t("summaryPending") : summary}
        </p>
        <p className="font-medium">{t("sourcesTitle")}</p>
        <ul className="space-y-1">
          {tip.evidence.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`tip-source-${tip.id}`}
                className="inline-flex items-start gap-1.5 underline decoration-ink/30 underline-offset-3 hover:decoration-ink"
              >
                <ExternalLink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                {source.label}
                <span className="sr-only"> {common("opensInNewTab")}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={tip.title[locale]}
      >
        <button
          type="button"
          aria-pressed={progress.tried}
          data-testid={`tip-tried-${tip.id}`}
          onClick={() =>
            onProgress({
              tried: !progress.tried,
              helpful: progress.tried ? null : progress.helpful,
            })
          }
          className={toggleClass}
        >
          {progress.tried ? <Check aria-hidden="true" className="size-4" /> : null}
          {t("tried")}
        </button>
        {progress.tried ? (
          <>
            <span className="px-1 text-sm text-muted-foreground">{t("helpfulQuestion")}</span>
            {(["yes", "no"] as const).map((answer) => (
              <button
                key={answer}
                type="button"
                aria-pressed={progress.helpful === answer}
                data-testid={`tip-helpful-${tip.id}-${answer}`}
                onClick={() =>
                  onProgress({ tried: true, helpful: progress.helpful === answer ? null : answer })
                }
                className={cn(toggleClass)}
              >
                {answer === "yes" ? t("helpfulYes") : t("helpfulNo")}
              </button>
            ))}
          </>
        ) : null}
      </div>
    </article>
  );
}

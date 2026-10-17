"use client";

import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { DURATION, EASE_CALM, fadeUp } from "@/components/motion/tokens";
import { SEVERITIES, type Severity, type Subscale, type SubscaleResult } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<Severity, string> = {
  normal: "bg-sev-normal border-sev-normal-edge",
  mild: "bg-sev-mild border-sev-mild-edge",
  moderate: "bg-sev-moderate border-sev-moderate-edge",
  severe: "bg-sev-severe border-sev-severe-edge",
  extremely_severe: "bg-sev-extreme border-sev-extreme-edge",
};

/**
 * Five ascending bars, filled up to the category level one after another.
 * Severity is always shown as text too, so the meter is decorative for
 * screen readers.
 */
export function SeverityMeter({ severity }: { severity: Severity }) {
  const level = SEVERITIES.indexOf(severity) + 1;
  return (
    <svg
      viewBox="0 0 44 24"
      width="44"
      height="24"
      aria-hidden="true"
      data-level={level}
      className="shrink-0"
    >
      {SEVERITIES.map((_, i) => {
        const height = (i + 1) * 4.8;
        return (
          <rect
            key={i}
            x={i * 9}
            y={24 - height}
            width="7"
            height={height}
            rx="1.5"
            className="fill-ink/15"
          />
        );
      })}
      {SEVERITIES.slice(0, level).map((_, i) => {
        const height = (i + 1) * 4.8;
        return (
          <m.rect
            key={i}
            x={i * 9}
            y={24 - height}
            width="7"
            height={height}
            rx="1.5"
            className="fill-ink"
            style={{ transformBox: "fill-box", originY: 1 }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: DURATION.base, ease: EASE_CALM, delay: 0.35 + i * 0.08 }}
          />
        );
      })}
    </svg>
  );
}

interface ResultCardProps {
  subscale: Subscale;
  result: SubscaleResult;
}

/** One DASS-21 dimension: category in words + meter + tint (HS-02, HS-03). */
export function ResultCard({ subscale, result }: ResultCardProps) {
  const t = useTranslations();
  const { severity, score } = result;
  const titleId = `result-${subscale}-title`;

  const intro =
    severity === "normal"
      ? t("explanation.introNormal", { subscale: t(`subscaleInline.${subscale}`) })
      : t("explanation.intro", {
          subscale: t(`subscaleInline.${subscale}`),
          severity: t(`severityInline.${severity}`),
        });

  return (
    <m.article
      variants={fadeUp}
      aria-labelledby={titleId}
      data-testid={`result-card-${subscale}`}
      data-severity={severity}
      data-score={score}
      className="surface grid gap-5 p-6 sm:p-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10"
    >
      <div className="space-y-3">
        <h2 id={titleId} className="text-2xl sm:text-3xl">
          {t(`subscale.${subscale}`)}
        </h2>
        <p
          className={cn(
            "inline-flex items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-3 text-base font-semibold text-ink",
            SEVERITY_STYLES[severity],
          )}
          data-testid={`result-severity-${subscale}`}
        >
          <SeverityMeter severity={severity} />
          {t(`severity.${severity}`)}
        </p>
        <p
          className="numeral text-lg text-muted-foreground"
          data-testid={`result-score-${subscale}`}
        >
          {t("results.scoreLabel", { score })}
        </p>
      </div>
      <p className="measure leading-relaxed md:border-l md:pl-10">
        {intro} {t(`explanation.${subscale}`)} {t(`explanation.advice.${severity}`)}
      </p>
    </m.article>
  );
}

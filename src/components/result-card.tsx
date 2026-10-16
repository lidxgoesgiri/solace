"use client";

import { useTranslations } from "next-intl";
import { SEVERITIES, type Severity, type Subscale, type SubscaleResult } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<Severity, string> = {
  normal: "bg-sev-normal border-l-sev-normal-edge",
  mild: "bg-sev-mild border-l-sev-mild-edge",
  moderate: "bg-sev-moderate border-l-sev-moderate-edge",
  severe: "bg-sev-severe border-l-sev-severe-edge",
  extremely_severe: "bg-sev-extreme border-l-sev-extreme-edge",
};

/**
 * Five ascending bars, filled up to the category level. Severity is always
 * shown as text too, so the meter is decorative for screen readers.
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
            className={i < level ? "fill-ink" : "fill-ink/15"}
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
    <article
      aria-labelledby={titleId}
      data-testid={`result-card-${subscale}`}
      data-severity={severity}
      data-score={score}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-l-8 p-5 text-ink",
        SEVERITY_STYLES[severity],
      )}
    >
      <h2 id={titleId} className="text-xl">
        {t(`subscale.${subscale}`)}
      </h2>
      <p
        className="flex items-center gap-2 text-lg font-semibold"
        data-testid={`result-severity-${subscale}`}
      >
        <SeverityMeter severity={severity} />
        {t(`severity.${severity}`)}
      </p>
      <p className="text-sm font-medium" data-testid={`result-score-${subscale}`}>
        {t("results.scoreLabel", { score })}
      </p>
      <p className="text-sm leading-relaxed">
        {intro} {t(`explanation.${subscale}`)} {t(`explanation.advice.${severity}`)}
      </p>
    </article>
  );
}

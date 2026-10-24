"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText } from "@/components/icons/file-text";
import { Info } from "@/components/icons/info";
import { categorize, MAX_SUBSCALE_SCORE, SEVERITIES, SUBSCALES, type Severity, type Subscale } from "@/lib/scoring";
import { cn } from "@/lib/utils";

/** Example depression scores, one inside each official category (CUTOFFS). */
const LEVEL_PRESETS: Record<Severity, number> = {
  normal: 6,
  mild: 12,
  moderate: 18,
  severe: 24,
  extremely_severe: 32,
};

/** Anxiety and stress follow the slider loosely, so the example rows differ. */
const SUBSCALE_FACTOR: Record<Subscale, number> = {
  depression: 1,
  anxiety: 0.85,
  stress: 1.15,
};

const CONTEXT_KEY = {
  normal: "simulator.contextNormal",
  mild: "simulator.contextMild",
  moderate: "simulator.contextModerate",
  severe: "simulator.contextSevere",
  extremely_severe: "simulator.contextExtremelySevere",
} as const satisfies Record<Severity, string>;

const BADGE_STYLE: Record<Severity, string> = {
  normal: "bg-sev-normal border-sev-normal-edge text-foreground",
  mild: "bg-sev-mild border-sev-mild-edge text-foreground",
  moderate: "bg-sev-moderate border-sev-moderate-edge text-foreground",
  severe: "bg-sev-severe border-sev-severe-edge text-foreground",
  extremely_severe: "bg-sev-extreme border-sev-extreme-edge text-foreground",
};

const BAR_COLOR: Record<Severity, string> = {
  normal: "bg-sage-ink",
  mild: "bg-sun-edge",
  moderate: "bg-sev-moderate-edge",
  severe: "bg-sev-severe-edge",
  extremely_severe: "bg-sev-extreme-edge",
};

const GLOW: Record<Severity, string> = {
  normal: "glow-sage",
  mild: "glow-sky",
  moderate: "glow-sun",
  severe: "glow-violet",
  extremely_severe: "glow-violet",
};

function subscaleScore(subscale: Subscale, score: number): number {
  return Math.min(MAX_SUBSCALE_SCORE, Math.max(0, Math.round(score * SUBSCALE_FACTOR[subscale])));
}

/**
 * Landing preview of the results page. Every category comes from
 * `categorize`, the same function the real results use; the slider sets the
 * depression score.
 */
export function ResultSimulator() {
  const t = useTranslations("landing");
  const severity = useTranslations("severity");
  const [currentScore, setCurrentScore] = useState<number>(LEVEL_PRESETS.moderate);
  const sliderId = useId();

  const activeLevel = categorize("depression", currentScore);

  return (
    <div
      data-testid="landing-report"
      data-severity={activeLevel}
      className={cn(
        "landing-report relative space-y-4 overflow-hidden rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-4 text-card-foreground shadow-sm transition-all duration-500 sm:p-5",
        GLOW[activeLevel],
      )}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-sage-ink uppercase">
            Solace · DASS-21
          </span>
          <h3 className="font-heading text-xl font-medium tracking-tight text-foreground sm:text-2xl">
            {t("resultsPreviewHeading")}
          </h3>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/60 text-sage-ink">
          <FileText aria-hidden="true" className="size-4" />
        </span>
      </div>

      {/* Preset Category Switcher */}
      <div
        role="group"
        aria-label={t("simulator.title")}
        className="grid grid-cols-3 gap-1 rounded-xl border border-border/80 bg-muted/60 p-1 text-xs sm:grid-cols-5"
      >
        {SEVERITIES.map((level) => {
          const isSelected = activeLevel === level;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={isSelected}
              data-testid={`simulator-level-${level}`}
              onClick={() => setCurrentScore(LEVEL_PRESETS[level])}
              className={cn(
                "cursor-pointer rounded-lg px-2 py-1.5 font-medium leading-tight transition-all duration-200 text-center",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
              )}
            >
              {severity(level)}
            </button>
          );
        })}
      </div>

      {/* Compact Inline Range Slider */}
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-xs">
        <label htmlFor={sliderId} className="font-medium text-foreground whitespace-nowrap">
          {t("simulator.scoreLabel")}:{" "}
          <strong className="font-semibold text-foreground">{currentScore}</strong>/{MAX_SUBSCALE_SCORE}
        </label>
        <input
          id={sliderId}
          type="range"
          min="0"
          max={MAX_SUBSCALE_SCORE}
          value={currentScore}
          onChange={(e) => setCurrentScore(Number(e.target.value))}
          aria-label={t("simulator.sliderLabel")}
          data-testid="simulator-score"
          className="accent-primary h-1.5 w-full cursor-pointer rounded-lg bg-muted"
        />
      </div>

      {/* 3 Compact Subscale Rows */}
      <div className="space-y-2">
        {SUBSCALES.map((subscale, index) => {
          const score = subscaleScore(subscale, currentScore);
          const level = categorize(subscale, score);
          const pct = Math.min(100, Math.round((score / MAX_SUBSCALE_SCORE) * 100));

          return (
            <div
              key={subscale}
              className="landing-preview-row rounded-xl border border-border/70 bg-background/50 px-3.5 py-2.5 transition-colors hover:border-border hover:bg-background/80"
            >
              <div className="flex items-center justify-between gap-2 pb-1.5">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="numeral text-xs font-semibold text-sage-ink">
                    0{index + 1}
                  </span>
                  <p className="font-heading text-base font-medium text-foreground">
                    {t(`subscales.${subscale}`)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    <strong className="font-semibold text-foreground">{score}</strong>/{MAX_SUBSCALE_SCORE}
                  </span>
                  <span
                    data-testid={`simulator-severity-${subscale}`}
                    data-severity={level}
                    className={cn("rounded-md border px-1.5 py-0.5 text-[11px] font-medium", BADGE_STYLE[level])}
                  >
                    {severity(level)}
                  </span>
                </div>
              </div>

              {/* Gauge bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                <div
                  className={cn("h-full transition-all duration-300 ease-out", BAR_COLOR[level])}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Context Banner */}
      <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-foreground">
        <Info aria-hidden="true" className="size-3.5 shrink-0 text-sage-ink" />
        <p>{t(CONTEXT_KEY[activeLevel])}</p>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t("resultsPreviewFooter")}
      </p>
    </div>
  );
}

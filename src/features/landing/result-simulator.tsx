"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText } from "@/components/icons/file-text";
import { Info } from "@/components/icons/info";
import { cn } from "@/lib/utils";

const LEVELS = ["normal", "mild", "moderate", "severe"] as const;
type SeverityLevel = (typeof LEVELS)[number];

const LEVEL_PRESETS: Record<SeverityLevel, { score: number; label: string }> = {
  normal: { score: 6, label: "normal" },
  mild: { score: 12, label: "mild" },
  moderate: { score: 18, label: "moderate" },
  severe: { score: 28, label: "severe" },
};

function getSeverityFromScore(score: number): SeverityLevel {
  if (score <= 9) return "normal";
  if (score <= 14) return "mild";
  if (score <= 21) return "moderate";
  return "severe";
}

export function ResultSimulator() {
  const t = useTranslations("landing");
  const [currentScore, setCurrentScore] = useState<number>(18);
  const sliderId = useId();

  const activeLevel = getSeverityFromScore(currentScore);
  const subscales = ["depression", "anxiety", "stress"] as const;

  // Derive individual subscale scores with slight natural variation around currentScore
  const getSubscaleScore = (subscale: (typeof subscales)[number]) => {
    if (subscale === "depression") return Math.min(42, Math.max(0, currentScore));
    if (subscale === "anxiety") return Math.min(42, Math.max(0, Math.round(currentScore * 0.85)));
    return Math.min(42, Math.max(0, Math.round(currentScore * 1.15)));
  };

  const getSubscaleLevel = (score: number, subscale: (typeof subscales)[number]): SeverityLevel => {
    if (subscale === "depression") {
      if (score <= 9) return "normal";
      if (score <= 13) return "mild";
      if (score <= 20) return "moderate";
      return "severe";
    }
    if (subscale === "anxiety") {
      if (score <= 7) return "normal";
      if (score <= 9) return "mild";
      if (score <= 14) return "moderate";
      return "severe";
    }
    if (score <= 14) return "normal";
    if (score <= 18) return "mild";
    if (score <= 25) return "moderate";
    return "severe";
  };

  const getBadgeStyle = (level: SeverityLevel) => {
    switch (level) {
      case "normal":
        return "bg-sev-normal border-sev-normal-edge text-foreground";
      case "mild":
        return "bg-sev-mild border-sev-mild-edge text-foreground";
      case "moderate":
        return "bg-sev-moderate border-sev-moderate-edge text-foreground";
      case "severe":
        return "bg-sev-severe border-sev-severe-edge text-foreground";
    }
  };

  const getBarColor = (level: SeverityLevel) => {
    switch (level) {
      case "normal":
        return "bg-sage-ink";
      case "mild":
        return "bg-sun-edge";
      case "moderate":
        return "bg-sev-moderate-edge";
      case "severe":
        return "bg-sev-severe-edge";
    }
  };

  return (
    <div
      data-testid="landing-report"
      className={cn(
        "landing-report relative space-y-4 overflow-hidden rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-4 text-card-foreground shadow-sm transition-all duration-500 sm:p-5",
        activeLevel === "normal" && "glow-sage",
        activeLevel === "mild" && "glow-sky",
        activeLevel === "moderate" && "glow-sun",
        activeLevel === "severe" && "glow-violet",
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
        className="grid grid-cols-4 gap-1 rounded-xl border border-border/80 bg-muted/60 p-1 text-xs"
      >
        {LEVELS.map((level) => {
          const isSelected = activeLevel === level;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setCurrentScore(LEVEL_PRESETS[level].score)}
              className={cn(
                "cursor-pointer rounded-lg px-2 py-1.5 font-medium transition-all duration-200 text-center",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
              )}
            >
              {t(`simulator.levels.${level}`)}
            </button>
          );
        })}
      </div>

      {/* Compact Inline Range Slider */}
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-xs">
        <label htmlFor={sliderId} className="font-medium text-foreground whitespace-nowrap">
          Skor: <strong className="font-semibold text-foreground">{currentScore}</strong>/42
        </label>
        <input
          id={sliderId}
          type="range"
          min="0"
          max="42"
          value={currentScore}
          onChange={(e) => setCurrentScore(Number(e.target.value))}
          aria-label="Atur skor simulasi DASS-21"
          className="accent-primary h-1.5 w-full cursor-pointer rounded-lg bg-muted"
        />
      </div>

      {/* 3 Compact Subscale Rows */}
      <div className="space-y-2">
        {subscales.map((subscale, index) => {
          const score = getSubscaleScore(subscale);
          const level = getSubscaleLevel(score, subscale);
          const pct = Math.min(100, Math.round((score / 42) * 100));

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
                    <strong className="font-semibold text-foreground">{score}</strong>/42
                  </span>
                  <span className={cn("rounded-md border px-1.5 py-0.5 text-[11px] font-medium", getBadgeStyle(level))}>
                    {t(`simulator.levels.${level}`)}
                  </span>
                </div>
              </div>

              {/* Gauge bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                <div
                  className={cn("h-full transition-all duration-300 ease-out", getBarColor(level))}
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
        <p className="line-clamp-2">
          {t(`simulator.context${activeLevel.charAt(0).toUpperCase() + activeLevel.slice(1)}` as Parameters<typeof t>[0])}
        </p>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t("resultsPreviewFooter")}
      </p>
    </div>
  );
}

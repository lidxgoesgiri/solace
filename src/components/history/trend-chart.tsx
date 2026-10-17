"use client";

import { useId } from "react";
import {
  CUTOFFS,
  MAX_SUBSCALE_SCORE,
  SEVERITIES,
  type Severity,
  type Subscale,
} from "@/lib/scoring";

export interface TrendPoint {
  /** ISO date of the screening. */
  at: string;
  score: number;
  severity: Severity;
}

const BAND_CLASS: Record<Severity, string> = {
  normal: "fill-sev-normal",
  mild: "fill-sev-mild",
  moderate: "fill-sev-moderate",
  severe: "fill-sev-severe",
  extremely_severe: "fill-sev-extreme",
};

const W = 320;
const H = 168;
const PAD = { left: 26, right: 10, top: 8, bottom: 24 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const y = (score: number) => PAD.top + PLOT_H * (1 - score / MAX_SUBSCALE_SCORE);

/** Category bands of one subscale on the ×2 scale, from the single CUTOFFS constant. */
function bands(subscale: Subscale): { severity: Severity; from: number; to: number }[] {
  const starts = [
    0,
    ...SEVERITIES.slice(1).map((s) => CUTOFFS[subscale][s as Exclude<Severity, "normal">]),
  ];
  return SEVERITIES.map((severity, i) => ({
    severity,
    from: starts[i]!,
    to: i + 1 < starts.length ? starts[i + 1]! : MAX_SUBSCALE_SCORE + 1,
  }));
}

interface TrendChartProps {
  subscale: Subscale;
  title: string;
  summary: string;
  points: TrendPoint[];
  formatShortDate: (iso: string) => string;
}

/**
 * RW-01: one subscale's score over time, with the category bands behind the
 * line. Decorative to assistive technology except for its summary; the
 * table under the charts carries every number.
 */
export function TrendChart({ subscale, title, summary, points, formatShortDate }: TrendChartProps) {
  const id = useId();
  const x = (index: number) =>
    points.length === 1 ? PAD.left + PLOT_W / 2 : PAD.left + (PLOT_W * index) / (points.length - 1);
  const path = points
    .map((point, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(point.score).toFixed(1)}`)
    .join(" ");

  return (
    <figure className="surface space-y-2 p-4" data-testid={`history-chart-${subscale}`}>
      <figcaption id={`${id}-title`} className="font-heading text-lg">
        {title}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        className="h-auto w-full"
      >
        <desc id={`${id}-desc`}>{summary}</desc>
        {bands(subscale).map((band) => (
          <rect
            key={band.severity}
            x={PAD.left}
            width={PLOT_W}
            y={y(Math.min(band.to, MAX_SUBSCALE_SCORE + 1) - 0.5)}
            height={Math.max(
              0,
              y(band.from - 0.5) - y(Math.min(band.to, MAX_SUBSCALE_SCORE + 1) - 0.5),
            )}
            className={BAND_CLASS[band.severity]}
          />
        ))}
        {[0, 21, 42].map((tick) => (
          <text
            key={tick}
            x={PAD.left - 6}
            y={y(tick) + 3}
            textAnchor="end"
            className="fill-muted-foreground text-[9px]"
          >
            {tick}
          </text>
        ))}
        <path
          d={path}
          fill="none"
          strokeWidth={2}
          className="stroke-primary"
          strokeLinejoin="round"
        />
        {points.map((point, i) => (
          <circle
            key={point.at}
            cx={x(i)}
            cy={y(point.score)}
            r={3.5}
            strokeWidth={2}
            className="fill-card stroke-primary"
          />
        ))}
        {points.length > 0 ? (
          <>
            <text
              x={x(0)}
              y={H - 6}
              textAnchor={points.length === 1 ? "middle" : "start"}
              className="fill-muted-foreground text-[9px]"
            >
              {formatShortDate(points[0]!.at)}
            </text>
            {points.length > 1 ? (
              <text
                x={x(points.length - 1)}
                y={H - 6}
                textAnchor="end"
                className="fill-muted-foreground text-[9px]"
              >
                {formatShortDate(points.at(-1)!.at)}
              </text>
            ) : null}
          </>
        ) : null}
      </svg>
    </figure>
  );
}

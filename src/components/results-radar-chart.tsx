"use client";

import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { SPRING_SMOOTH } from "@/components/motion/tokens";
import type { Dass21Result } from "@/lib/scoring";

interface ResultsRadarChartProps {
  result: Dass21Result;
}

/**
 * Web3 Tri-Axial Radar / Spider Chart.
 * Visualizes the holistic balance of Depression, Anxiety, and Stress with glowing polygon physics.
 */
export function ResultsRadarChart({ result }: ResultsRadarChartProps) {
  const t = useTranslations();
  const id = useId();
  const [activeAxis, setActiveAxis] = useState<string | null>(null);

  // Center and Radius of radar
  const CX = 160;
  const CY = 150;
  const MAX_R = 100;

  // Max score per subscale is 42
  const depScore = result.depression.score;
  const anxScore = result.anxiety.score;
  const strScore = result.stress.score;

  // Normalized values (min 0.08 so triangle has slight area, max 1.0)
  const normDep = Math.max(0.08, Math.min(1, depScore / 42));
  const normAnx = Math.max(0.08, Math.min(1, anxScore / 42));
  const normStr = Math.max(0.08, Math.min(1, strScore / 42));

  // Angles: Depression at top (-90° / -π/2), Anxiety at bottom-right (30° / π/6), Stress at bottom-left (150° / 5π/6)
  const getPoint = (normalizedVal: number, angleRad: number) => {
    const r = normalizedVal * MAX_R;
    return {
      x: CX + r * Math.cos(angleRad),
      y: CY + r * Math.sin(angleRad),
    };
  };

  const pDep = getPoint(normDep, -Math.PI / 2);
  const pAnx = getPoint(normAnx, Math.PI / 6);
  const pStr = getPoint(normStr, (5 * Math.PI) / 6);

  // Grid levels (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const polygonPath = `M ${pDep.x} ${pDep.y} L ${pAnx.x} ${pAnx.y} L ${pStr.x} ${pStr.y} Z`;

  return (
    <div
      className="glass-surface relative overflow-hidden p-6 sm:p-8"
      data-testid="results-radar-chart"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <span className="text-xs font-semibold tracking-wider text-sage-ink uppercase">
            {t("results.title")} · Tri-Axial Analysis
          </span>
          <h3 className="font-heading text-xl font-medium tracking-tight text-foreground sm:text-2xl">
            Keseimbangan Emosional
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block size-2 rounded-full bg-primary" />
          <span>Skala DASS-21 (0–42)</span>
        </div>
      </div>

      <div className="relative mx-auto mt-4 aspect-square max-w-[340px]">
        <svg
          viewBox="0 0 320 300"
          className="size-full overflow-visible select-none"
          role="img"
          aria-label="Grafik Tri-Axial Radar DASS-21"
        >
          <defs>
            <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
              <stop offset="70%" stopColor="var(--brand-sky)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}-edge`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--brand-sky)" />
              <stop offset="50%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--brand-sage)" />
            </linearGradient>
          </defs>

          {/* Concentric Guide Triangles */}
          {gridLevels.map((lvl) => {
            const top = getPoint(lvl, -Math.PI / 2);
            const right = getPoint(lvl, Math.PI / 6);
            const left = getPoint(lvl, (5 * Math.PI) / 6);
            return (
              <polygon
                key={lvl}
                points={`${top.x},${top.y} ${right.x},${right.y} ${left.x},${left.y}`}
                fill="none"
                className="stroke-border/60"
                strokeWidth={lvl === 1 ? "1.5" : "1"}
                strokeDasharray={lvl === 1 ? undefined : "3 3"}
              />
            );
          })}

          {/* Axes Lines */}
          <line x1={CX} y1={CY} x2={CX} y2={CY - MAX_R} className="stroke-border/80" strokeWidth="1" />
          <line
            x1={CX}
            y1={CY}
            x2={CX + MAX_R * Math.cos(Math.PI / 6)}
            y2={CY + MAX_R * Math.sin(Math.PI / 6)}
            className="stroke-border/80"
            strokeWidth="1"
          />
          <line
            x1={CX}
            y1={CY}
            x2={CX + MAX_R * Math.cos((5 * Math.PI) / 6)}
            y2={CY + MAX_R * Math.sin((5 * Math.PI) / 6)}
            className="stroke-border/80"
            strokeWidth="1"
          />

          {/* The Data Polygon */}
          <m.path
            d={polygonPath}
            fill={`url(#${id}-glow)`}
            stroke={`url(#${id}-edge)`}
            strokeWidth="2.5"
            strokeLinejoin="round"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING_SMOOTH}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          />

          {/* Interactive Node: Depression (Top) */}
          <g
            className="cursor-pointer"
            onMouseEnter={() => setActiveAxis("depression")}
            onMouseLeave={() => setActiveAxis(null)}
          >
            <circle
              cx={pDep.x}
              cy={pDep.y}
              r={activeAxis === "depression" ? 7 : 5}
              className="fill-card stroke-primary transition-all duration-200"
              strokeWidth="2.5"
            />
            <text
              x={CX}
              y={CY - MAX_R - 16}
              textAnchor="middle"
              className="fill-foreground font-heading text-xs font-medium sm:text-sm"
            >
              {t("subscale.depression")} ({depScore})
            </text>
          </g>

          {/* Interactive Node: Anxiety (Bottom Right) */}
          <g
            className="cursor-pointer"
            onMouseEnter={() => setActiveAxis("anxiety")}
            onMouseLeave={() => setActiveAxis(null)}
          >
            <circle
              cx={pAnx.x}
              cy={pAnx.y}
              r={activeAxis === "anxiety" ? 7 : 5}
              className="fill-card stroke-primary transition-all duration-200"
              strokeWidth="2.5"
            />
            <text
              x={CX + MAX_R * Math.cos(Math.PI / 6) + 12}
              y={CY + MAX_R * Math.sin(Math.PI / 6) + 14}
              textAnchor="start"
              className="fill-foreground font-heading text-xs font-medium sm:text-sm"
            >
              {t("subscale.anxiety")} ({anxScore})
            </text>
          </g>

          {/* Interactive Node: Stress (Bottom Left) */}
          <g
            className="cursor-pointer"
            onMouseEnter={() => setActiveAxis("stress")}
            onMouseLeave={() => setActiveAxis(null)}
          >
            <circle
              cx={pStr.x}
              cy={pStr.y}
              r={activeAxis === "stress" ? 7 : 5}
              className="fill-card stroke-primary transition-all duration-200"
              strokeWidth="2.5"
            />
            <text
              x={CX + MAX_R * Math.cos((5 * Math.PI) / 6) - 12}
              y={CY + MAX_R * Math.sin((5 * Math.PI) / 6) + 14}
              textAnchor="end"
              className="fill-foreground font-heading text-xs font-medium sm:text-sm"
            >
              {t("subscale.stress")} ({strScore})
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}

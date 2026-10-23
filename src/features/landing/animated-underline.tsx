"use client";

import { m } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { LANDING_EASE } from "@/features/landing/motion";
import { useLandingReducedMotion } from "@/features/landing/motion-preferences";
import { cn } from "@/lib/utils";

interface AnimatedUnderlineProps {
  children: ReactNode;
  className?: string;
}

/**
 * A semantic inline emphasis with a hand-drawn SVG underline. The words stay
 * readable when JavaScript or motion is unavailable; only the stroke enhances.
 * Behaviour adapted from Anurag Mishra's 21st.dev Animated Underline Text.
 */
export function AnimatedUnderline({ children, className }: AnimatedUnderlineProps) {
  const reducedMotion = useLandingReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path || reducedMotion || typeof path.animate !== "function") return;
    const draw = path.animate(
      [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
      { duration: 1100, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    return () => draw.cancel();
  }, [reducedMotion]);

  return (
    <m.span
      initial={false}
      animate="rest"
      whileHover="hover"
      className={cn("relative inline-block text-sage-ink", className)}
    >
      {children}
      <m.svg
        aria-hidden="true"
        viewBox="0 0 300 18"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -right-1 -bottom-1.5 -left-1 h-3 w-[calc(100%+0.5rem)] overflow-visible"
      >
        <m.path
          ref={pathRef}
          d="M4 10 C58 2 105 16 154 9 C202 3 245 5 296 10"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="0"
          opacity={0.82}
          initial={false}
          transition={{ duration: reducedMotion ? 0 : 0.65, ease: LANDING_EASE }}
          variants={reducedMotion ? undefined : {
            rest: { d: "M4 10 C58 2 105 16 154 9 C202 3 245 5 296 10" },
            hover: { d: "M4 9 C58 15 105 2 154 10 C202 16 245 3 296 8" },
          }}
        />
      </m.svg>
    </m.span>
  );
}

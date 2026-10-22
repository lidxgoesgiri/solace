"use client";

import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
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
  const reducedMotion = useReducedMotion();
  return (
    <m.span
      initial="rest"
      animate="rest"
      whileHover="hover"
      className={cn("relative inline-block text-sage-ink", className)}
    >
      {children}
      <m.svg
        aria-hidden="true"
        viewBox="0 0 300 18"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -right-1 -bottom-2 -left-1 h-3 w-[calc(100%+0.5rem)] overflow-visible"
      >
        <m.path
          d="M4 10 C58 2 105 16 154 9 C202 3 245 5 296 10"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3"
          initial={reducedMotion ? { pathLength: 1, opacity: 0.82 } : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 0.82 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
          variants={reducedMotion ? undefined : {
            rest: { d: "M4 10 C58 2 105 16 154 9 C202 3 245 5 296 10" },
            hover: { d: "M4 9 C58 15 105 2 154 10 C202 16 245 3 296 8" },
          }}
        />
      </m.svg>
    </m.span>
  );
}

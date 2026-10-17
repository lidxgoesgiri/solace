import type { Transition, Variants } from "framer-motion";

/**
 * Motion grammar for Solace: slow to start, soft to land, never bouncy.
 * Mirrors the CSS tokens in globals.css (--ease-calm, --duration-*).
 */
export const EASE_CALM = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  /** Feedback on a control: selection, press, toggle. */
  quick: 0.18,
  /** Content entering: a page, a section, a card. */
  base: 0.32,
  /** Ambient change the user is not waiting on. */
  slow: 0.6,
} as const;

/** Gap between items in a staggered reveal. */
export const STAGGER = 0.06;

export const calm: Transition = { duration: DURATION.base, ease: EASE_CALM };

/** Rise a few pixels while fading in. Small distance keeps it calm. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: calm },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: calm },
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER, delayChildren: 0.04 } },
};

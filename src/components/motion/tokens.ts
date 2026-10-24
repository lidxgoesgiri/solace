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

/**
 * Modern Web3 / Cyber-Zen Spring Physics.
 * Buttery smooth 60/120fps with organic settling.
 */
export const SPRING_TACTILE: Transition = {
  type: "spring",
  stiffness: 450,
  damping: 28,
  mass: 0.8,
};

export const SPRING_SMOOTH: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 25,
  mass: 1,
};

export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 140,
  damping: 22,
  mass: 1.1,
};

export const SPRING_FLOAT: Transition = {
  type: "spring",
  stiffness: 60,
  damping: 18,
  mass: 1.4,
};

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

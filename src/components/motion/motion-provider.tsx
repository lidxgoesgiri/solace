"use client";

import { LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { calm } from "@/components/motion/tokens";

const loadFeatures = () => import("@/components/motion/features").then((mod) => mod.default);

/**
 * Loads only the DOM animation features (no drag or layout), and only after
 * the page has rendered, to keep the screening pages light. Follows the
 * system reduced-motion setting: with "reduce", movement is dropped and only
 * opacity changes remain.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={calm}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

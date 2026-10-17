"use client";

import { m } from "framer-motion";
import { Logo } from "@/components/logo";
import { DURATION, EASE_CALM } from "@/components/motion/tokens";

const rise = { duration: 1.4, ease: EASE_CALM };

/**
 * The landing motif: a sun rising over a quiet horizon, taken from the
 * logo's story (sun, water, leaves). The logo itself sits unchanged on its
 * white circle; the shapes around it are decoration only.
 */
export function SunriseMark() {
  return (
    <div className="relative mx-auto aspect-[6/5] w-full max-w-md select-none" aria-hidden="true">
      <svg viewBox="0 0 480 400" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <clipPath id="above-horizon">
            <rect x="-40" y="-40" width="560" height="290" />
          </clipPath>
        </defs>
        <g clipPath="url(#above-horizon)">
          <m.g
            initial={{ y: 70, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={rise}
          >
            <circle cx="240" cy="250" r="190" className="fill-sun-soft" />
            <circle cx="240" cy="250" r="132" className="fill-sun/60" />
          </m.g>
        </g>
        <line x1="0" y1="250" x2="480" y2="250" className="stroke-ink/25" strokeWidth="1.25" />
        <m.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: DURATION.slow, ease: EASE_CALM, delay: 0.5 }}
          fill="none"
          strokeLinecap="round"
          strokeWidth="2"
        >
          <path d="M70 290 C 140 272, 190 308, 260 290 S 380 272, 420 288" className="stroke-sky" />
          <path d="M120 326 C 180 312, 220 340, 290 326 S 380 314, 400 324" className="stroke-sky/70" />
          <path d="M170 360 C 210 350, 250 368, 300 358" className="stroke-sage" />
        </m.g>
      </svg>
      <div className="absolute inset-x-0 top-[43%] flex -translate-y-1/2 justify-center">
        <Logo size={92} className="shadow-(--shadow-lift)" />
      </div>
    </div>
  );
}

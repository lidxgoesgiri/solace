"use client";

import { m, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useId, useRef, type PointerEvent } from "react";
import { Logo } from "@/components/logo";
import { LANDING_SPRING } from "@/features/landing/motion";
import { useDocumentVisible, useLandingReducedMotion } from "@/features/landing/motion-preferences";

/**
 * The landing motif: a sun rising over a quiet horizon, taken from the
 * logo's story (sun, water, leaves). The logo itself sits unchanged on its
 * white circle; the shapes around it are decoration only.
 */
export function SunriseMark() {
  const ref = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const reducedMotion = useLandingReducedMotion();
  const documentVisible = useDocumentVisible();
  const inView = useInView(ref, { margin: "60px" });
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(y, LANDING_SPRING);
  const rotateY = useSpring(x, LANDING_SPRING);
  const ambient = inView && documentVisible && !reducedMotion;

  useEffect(() => {
    if (!ambient) { x.set(0); y.set(0); }
  }, [ambient, x, y]);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 7);
    y.set(-((event.clientY - bounds.top) / bounds.height - 0.5) * 5);
  };
  const settle = () => { x.set(0); y.set(0); };

  return (
    <div
      ref={ref}
      data-testid="sunrise-visual"
      className="sunrise-visual relative mx-auto aspect-[6/5] w-full max-w-[32rem] select-none"
      aria-hidden="true"
      onPointerMove={move}
      onPointerLeave={settle}
      onPointerCancel={settle}
    >
      <m.div
        className="sunrise-scene absolute inset-0"
        style={{ rotateX: reducedMotion ? 0 : rotateX, rotateY: reducedMotion ? 0 : rotateY, transformPerspective: 1000 }}
      >
      <svg viewBox="0 0 480 400" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <clipPath id={clipId}>
            <rect x="-40" y="-40" width="560" height="290" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <m.g
            initial={false}
            animate={{ y: ambient ? [0, -5, 0] : 0 }}
            transition={ambient ? { duration: 13, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
          >
            <circle cx="240" cy="250" r="190" className="fill-sun-soft" />
            <circle cx="240" cy="250" r="132" className="fill-sun/60" />
          </m.g>
        </g>
        <line x1="0" y1="250" x2="480" y2="250" className="stroke-ink/25" strokeWidth="1.25" />
        <m.g
          initial={false}
          animate={{ x: ambient ? [0, 5, -3, 0] : 0 }}
          transition={ambient ? { duration: 15, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
          fill="none"
          strokeLinecap="round"
          strokeWidth="2"
        >
          <m.path
            d="M70 290 C 140 272, 190 308, 260 290 S 380 272, 420 288"
            className="stroke-sky"
            initial={false}
            animate={{ d: ambient ? [
              "M70 290 C 140 272, 190 308, 260 290 S 380 272, 420 288",
              "M70 288 C 140 306, 190 274, 260 289 S 380 306, 420 290",
              "M70 290 C 140 272, 190 308, 260 290 S 380 272, 420 288",
            ] : "M70 290 C 140 272, 190 308, 260 290 S 380 272, 420 288" }}
            transition={ambient ? { duration: 14, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
          />
          <path d="M120 326 C 180 312, 220 340, 290 326 S 380 314, 400 324" className="stroke-sky/70" />
          <path d="M170 360 C 210 350, 250 368, 300 358" className="stroke-sage" />
        </m.g>
      </svg>
      <div className="absolute inset-x-0 top-[43%] flex -translate-y-1/2 justify-center">
        <m.div
          className="sunrise-floating"
          initial={false}
          animate={{ y: ambient ? [0, -5, 0] : 0 }}
          transition={ambient ? { duration: 9, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
        >
          <Logo size={92} priority className="shadow-(--shadow-lift)" />
        </m.div>
      </div>
      </m.div>
      <span className="sunrise-pointer-ripple absolute top-[58%] left-1/2 h-8 w-40 -translate-x-1/2 rounded-[50%] border border-sky/25" />
    </div>
  );
}

"use client";

import { m, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useId, useRef, type PointerEvent } from "react";
import { Logo } from "@/components/logo";
import { LANDING_SPRING } from "@/features/landing/motion";
import { useDocumentVisible, useLandingReducedMotion } from "@/features/landing/motion-preferences";
import styles from "@/features/landing/sunrise-mark.module.css";

/**
 * The landing motif: a sun rising over a quiet horizon, taken from the
 * logo's story (sun, water, leaves). The logo itself sits unchanged on its
 * white circle; the shapes around it are decoration only.
 */
export function SunriseMark() {
  const ref = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const auraId = useId();
  const discId = useId();
  const coreId = useId();
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
      className={`${styles.visual} sunrise-visual relative z-10 mx-auto aspect-[6/5] w-full max-w-[32rem] select-none`}
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
          <radialGradient id={auraId} cx="50%" cy="45%" r="50%">
            <stop offset="0%" className={styles.auraCenter} />
            <stop offset="65%" className={styles.auraMiddle} />
            <stop offset="100%" className={styles.auraEdge} />
          </radialGradient>
          <radialGradient id={discId} cx="42%" cy="20%" r="90%">
            <stop offset="0%" className={styles.discLight} />
            <stop offset="60%" className={styles.discWarm} />
            <stop offset="100%" className={styles.discEdge} />
          </radialGradient>
          <radialGradient id={coreId} cx="45%" cy="12%" r="92%">
            <stop offset="0%" className={styles.coreLight} />
            <stop offset="100%" className={styles.coreWarm} />
          </radialGradient>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <g className={styles.rise}>
            <m.g
              className={styles.aura}
              style={{ x: reducedMotion ? 0 : rotateY, y: reducedMotion ? 0 : rotateX }}
            >
              <circle cx="240" cy="250" r="228" fill={`url(#${auraId})`} />
            </m.g>
            <circle cx="240" cy="250" r="190" fill={`url(#${discId})`} className={styles.rim} />
            <circle cx="240" cy="250" r="132" fill={`url(#${coreId})`} />
          </g>
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
        <div className="sunrise-floating">
          <Logo size={92} priority className="shadow-(--shadow-lift)" />
        </div>
      </div>
      </m.div>
    </div>
  );
}

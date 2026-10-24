"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { usePathname } from "@/i18n/navigation";
import { PATHS } from "@/lib/flow";

/** Once the light is this close to the pointer (px), the frame loop sleeps. */
const SETTLE_PX = 0.1;

/**
 * Ambient Ethereal Spotlight that smoothly follows the cursor on desktop.
 * The frame loop runs only while the light catches up with the pointer, and
 * the light stays off on the crisis screen, which never animates.
 */
export function CursorSpotlight() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const onCrisis = usePathname() === PATHS.krisis;
  const enabled = !reducedMotion && !onCrisis;

  useEffect(() => {
    const container = containerRef.current;
    const spotlight = spotlightRef.current;
    if (!enabled || !container || !spotlight) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    // Show container
    container.style.display = "block";

    let currentX = -1000;
    let currentY = -1000;
    let targetX = -1000;
    let targetY = -1000;
    let rafId = 0;

    const place = () => {
      spotlight.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    };

    const loop = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      const settled =
        Math.abs(targetX - currentX) < SETTLE_PX && Math.abs(targetY - currentY) < SETTLE_PX;
      if (settled) {
        currentX = targetX;
        currentY = targetY;
      }
      place();
      rafId = settled ? 0 : requestAnimationFrame(loop);
    };

    // Off-screen until the pointer first moves.
    place();

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (rafId === 0) rafId = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ display: "none" }}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        ref={spotlightRef}
        className="absolute -top-[250px] -left-[250px] size-[500px] rounded-full opacity-35 dark:opacity-20 blur-[90px] transition-opacity duration-500 will-change-transform"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand-sky) 60%, var(--brand-sage)) 0%, color-mix(in srgb, var(--brand-sun) 25%, transparent) 50%, transparent 70%)",
        }}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient Ethereal Spotlight that smoothly follows the cursor on desktop.
 * Adds dynamic Web3 spatial lighting without impacting performance or accessibility.
 */
export function CursorSpotlight() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!isFinePointer || prefersReducedMotion || !containerRef.current) return;

    // Show container
    containerRef.current.style.display = "block";

    let currentX = -1000;
    let currentY = -1000;
    let targetX = -1000;
    let targetY = -1000;
    let rafId: number;

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const loop = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      if (spotlightRef.current) {
        spotlightRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }
      rafId = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

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

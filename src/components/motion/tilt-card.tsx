"use client";

import { m, useMotionValue, useSpring } from "framer-motion";
import { type ComponentPropsWithoutRef, type PointerEvent, type ReactNode, useRef, useState } from "react";
import { SPRING_SMOOTH } from "@/components/motion/tokens";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

interface TiltCardProps extends Omit<ComponentPropsWithoutRef<typeof m.div>, "children"> {
  children?: ReactNode;
  maxTilt?: number;
  glowColor?: string;
}

/**
 * 3D Interactive Web3 Tilt Card with dynamic specular glare and spring physics.
 * Stays flat when the user prefers reduced motion.
 */
export function TiltCard({
  children,
  className,
  maxTilt = 8,
  glowColor = "rgba(168, 197, 218, 0.15)",
  ...props
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(y, SPRING_SMOOTH);
  const rotateY = useSpring(x, SPRING_SMOOTH);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!ref.current || e.pointerType !== "mouse" || reducedMotion) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    x.set((px - 0.5) * maxTilt * 2);
    y.set(-(py - 0.5) * maxTilt * 2);

    // CSS variables move the glare without re-rendering the card.
    glareRef.current?.style.setProperty("--glare-x", `${px * 100}%`);
    glareRef.current?.style.setProperty("--glare-y", `${py * 100}%`);
  };

  const onPointerLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <m.div
      ref={ref}
      onPointerEnter={() => setIsHovered(true)}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/80 bg-card/85 backdrop-blur-md transition-shadow duration-300",
        isHovered && "shadow-lift border-primary/40",
        className,
      )}
      {...props}
    >
      {/* Dynamic Specular Glare */}
      <div
        ref={glareRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 220px at var(--glare-x, 50%) var(--glare-y, 50%), ${glowColor}, transparent 80%)`,
        }}
      />
      {children}
    </m.div>
  );
}

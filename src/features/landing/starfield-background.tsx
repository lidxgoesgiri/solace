"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useLandingReducedMotion } from "./motion-preferences";

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  vx: number;
  vy: number;
  colorType: "white" | "cyan" | "gold" | "sage";
}

const emptySubscribe = () => () => {};

/**
 * Ambient Web3 Ethereal Starfield & Aurora Mesh Background.
 * Portals directly into document.body to remain completely independent of
 * page layout width, transforms, or locale switches.
 */
export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useLandingReducedMotion();

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isClient) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const isDark = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      if (theme === "dark") return true;
      if (theme === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };

    const setupCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setupCanvas();

    // Responsive star count: ~65 on desktop, ~30 on mobile
    const starCount = Math.floor((width * height) / 19000);
    const count = Math.min(Math.max(starCount, 30), 80);

    const colors = {
      dark: {
        white: "245, 248, 250",
        cyan: "125, 211, 252",
        gold: "253, 224, 71",
        sage: "110, 231, 183",
      },
      light: {
        white: "100, 116, 139",
        cyan: "3, 105, 161",
        gold: "180, 83, 9",
        sage: "4, 120, 87",
      },
    };

    const colorKeys: Star["colorType"][] = ["white", "white", "cyan", "gold", "sage"];

    const stars: Star[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.6,
      baseOpacity: Math.random() * 0.45 + 0.25,
      twinkleSpeed: Math.random() * 0.02 + 0.008,
      twinklePhase: Math.random() * Math.PI * 2,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -(Math.random() * 0.18 + 0.04), // Gentle drift upwards
      colorType: colorKeys[Math.floor(Math.random() * colorKeys.length)]!,
    }));

    // Mouse parallax offset
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / width - 0.5) * 18;
      targetMouseY = (e.clientY / height - 0.5) * 18;
    };

    // With reduced motion no loop repaints the sky, so repaint it on demand.
    const repaintStill = () => {
      if (reducedMotion) render();
    };

    const handleResize = () => {
      const oldWidth = width;
      const oldHeight = height;
      setupCanvas(); // resizing the canvas also clears it
      if (oldWidth > 0 && oldHeight > 0) {
        for (const star of stars) {
          star.x *= width / oldWidth;
          star.y *= height / oldHeight;
        }
      }
      repaintStill();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    // The moving sky reads the theme every frame; the still one repaints here.
    const themeObserver = new MutationObserver(repaintStill);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    colorScheme.addEventListener("change", repaintStill);

    let isVisible = !document.hidden;
    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (!isVisible) return;
      if (reducedMotion) {
        render();
      } else {
        // A frame queued before the tab was hidden may still be pending;
        // cancel it so only one loop runs.
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const render = () => {
      if (!isVisible) return;

      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const dark = isDark();
      const currentColors = dark ? colors.dark : colors.light;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i]!;

        if (!reducedMotion) {
          star.x += star.vx;
          star.y += star.vy;
          star.twinklePhase += star.twinkleSpeed;

          // Wrap around edges
          if (star.x < 0) star.x = width;
          if (star.x > width) star.x = 0;
          if (star.y < 0) star.y = height;
          if (star.y > height) star.y = 0;
        }

        const opacityMult = 0.5 + 0.5 * Math.sin(star.twinklePhase);
        const opacity = star.baseOpacity * (0.6 + 0.4 * opacityMult) * (dark ? 0.95 : 0.45);
        const rgb = currentColors[star.colorType];

        const renderX = star.x + mouseX * (star.size / 2);
        const renderY = star.y + mouseY * (star.size / 2);

        // Core star dot
        ctx.beginPath();
        ctx.arc(renderX, renderY, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${opacity})`;
        ctx.fill();

        // Soft glow around larger stars in dark mode
        if (star.size > 1.3 && dark) {
          ctx.beginPath();
          ctx.arc(renderX, renderY, star.size * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb}, ${opacity * 0.22})`;
          ctx.fill();
        }
      }

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (reducedMotion) {
      render();
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      themeObserver.disconnect();
      colorScheme.removeEventListener("change", repaintStill);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isClient, reducedMotion]);

  if (!isClient || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Dynamic Canvas Starfield */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full pointer-events-none"
      />

      {/* Luminous Web3 Aurora Mesh Orbs */}
      <div className="absolute -top-32 -left-32 size-[32rem] rounded-full bg-gradient-to-br from-sky/20 via-teal-500/10 to-transparent blur-[110px]" />
      <div className="absolute top-[28%] -right-40 size-[36rem] rounded-full bg-gradient-to-bl from-sun/20 via-sun-edge/10 to-transparent blur-[120px]" />
      <div className="absolute top-[65%] -left-32 size-[34rem] rounded-full bg-gradient-to-tr from-sage/20 via-sage-ink/10 to-transparent blur-[115px]" />
    </div>,
    document.body,
  );
}

"use client";

import { useEffect, useRef } from "react";
import styles from "@/features/landing/hero-wordmark.module.css";

interface Dot {
  originX: number;
  originY: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

/**
 * Restored from the original footer (070df97), inspired by Kedhareswer Naidu's
 * MIT-licensed 21st.dev Halftone Wordmark Footer. Sampling, density, spring,
 * damping, repulsion and click ripple are unchanged. Only the palette and
 * input surface adapt to its new place behind the hero content.
 */
export function HalftoneWordmark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -1000, y: -1000, active: false, ripple: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = canvas?.parentElement;
    const hero = wrapper?.closest<HTMLElement>("[data-halftone-hero]");
    if (!canvas || !wrapper || !hero || typeof ResizeObserver === "undefined" || typeof IntersectionObserver === "undefined") return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const eligible = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let disposed = false;
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let radius = 1.5;
    let visible = false;
    let frame = 0;
    let last = 0;
    let restingColor = "#3d5c45";
    let displacedColor = "#f5d7a1";

    const updateColors = () => {
      const palette = getComputedStyle(wrapper);
      restingColor = palette.color;
      displacedColor = palette.getPropertyValue("--brand-sun").trim() || "#f5d7a1";
    };

    const fallback = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      wrapper.dataset.enhanced = "false";
    };

    const draw = (now: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden || !eligible.matches || dots.length === 0) return;
      // Preserve the original 30 fps cap and elapsed-time spring integration.
      if (now - last < 30) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const elapsed = Math.min(2.5, (now - last) / 16.67);
      last = now;
      context.clearRect(0, 0, width, height);
      const reach = Math.min(130, width * 0.11) + pointer.current.ripple;

      for (const dot of dots) {
        const dx = dot.x - pointer.current.x;
        const dy = dot.y - pointer.current.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (pointer.current.active && distance < reach) {
          const force = (1 - distance / reach) * 1.25 * elapsed;
          dot.velocityX += dx / distance * force;
          dot.velocityY += dy / distance * force;
        }
        dot.velocityX += (dot.originX - dot.x) * 0.027 * elapsed;
        dot.velocityY += (dot.originY - dot.y) * 0.027 * elapsed;
        const damping = Math.pow(0.84, elapsed);
        dot.velocityX *= damping;
        dot.velocityY *= damping;
        dot.x += dot.velocityX * elapsed;
        dot.y += dot.velocityY * elapsed;
        const displaced = Math.hypot(dot.x - dot.originX, dot.y - dot.originY) > 5;
        context.fillStyle = displaced ? displacedColor : restingColor;
        context.globalAlpha = displaced ? 0.88 : 0.8;
        context.beginPath();
        context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        context.fill();
      }
      pointer.current.ripple *= Math.pow(0.91, elapsed);
      wrapper.dataset.enhanced = "true";
      frame = requestAnimationFrame(draw);
    };

    const resume = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (visible && eligible.matches && !document.hidden && !disposed) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    const build = () => {
      if (disposed || !eligible.matches) { fallback(); return; }
      const box = wrapper.getBoundingClientRect();
      width = Math.round(box.width);
      height = Math.round(box.height);
      if (!width || !height) { fallback(); return; }
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      updateColors();

      const sample = document.createElement("canvas");
      sample.width = width;
      sample.height = height;
      const sampleContext = sample.getContext("2d", { willReadFrequently: true });
      if (!sampleContext) { fallback(); return; }
      const text = wrapper.querySelector(".halftone-static-word");
      const type = getComputedStyle(text ?? wrapper);
      const font = type.fontFamily;
      const fontSize = Number.parseFloat(type.fontSize);
      sampleContext.font = `600 ${fontSize}px ${font}`;
      if ("letterSpacing" in sampleContext) sampleContext.letterSpacing = type.letterSpacing;
      sampleContext.textAlign = "center";
      sampleContext.textBaseline = "alphabetic";
      sampleContext.fillText("solace", width / 2, height - fontSize * 0.04);

      try {
        const pixels = sampleContext.getImageData(0, 0, width, height).data;
        const gap = width < 1000 ? 7 : 8;
        radius = gap * 0.22;
        const next: Dot[] = [];
        for (let y = 2; y < height; y += gap) {
          for (let x = 2; x < width; x += gap) {
            if ((pixels[(y * width + x) * 4 + 3] ?? 0) > 96) {
              next.push({ originX: x, originY: y, x, y, velocityX: 0, velocityY: 0 });
            }
          }
        }
        dots = next;
        if (!dots.length) { fallback(); return; }
        resume();
      } catch {
        fallback();
      }
    };

    // Read pointer input on the hero, including above links, without making
    // the decorative canvas a hit target or cancelling any native action.
    const move = (event: PointerEvent) => {
      if (!visible || !eligible.matches || document.hidden) {
        pointer.current.active = false;
        return;
      }
      const box = canvas.getBoundingClientRect();
      pointer.current.x = event.clientX - box.left;
      pointer.current.y = event.clientY - box.top;
      pointer.current.active = pointer.current.x >= 0 && pointer.current.x <= box.width
        && pointer.current.y >= 0 && pointer.current.y <= box.height;
    };
    const leave = () => { pointer.current.active = false; };
    const press = (event: PointerEvent) => {
      move(event);
      if (pointer.current.active) pointer.current.ripple = 65;
    };
    const pointerOptions = { capture: true, passive: true } as const;
    hero.addEventListener("pointermove", move, pointerOptions);
    hero.addEventListener("pointerdown", press, pointerOptions);
    hero.addEventListener("pointerleave", leave, { passive: true });
    hero.addEventListener("pointercancel", leave, pointerOptions);

    const resize = new ResizeObserver(build);
    resize.observe(wrapper);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      resume();
    }, { rootMargin: "60px" });
    intersection.observe(wrapper);
    const preference = () => { leave(); fallback(); build(); };
    eligible.addEventListener("change", preference);
    document.addEventListener("visibilitychange", resume);
    const theme = new MutationObserver(updateColors);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    systemTheme.addEventListener("change", updateColors);
    canvas.addEventListener("contextlost", fallback);
    canvas.addEventListener("contextrestored", build);
    // Match the self-hosted font used by the DOM fallback, not a system alias.
    void document.fonts.ready.then(() => { if (!disposed) build(); });
    build();

    return () => {
      disposed = true;
      fallback();
      resize.disconnect();
      intersection.disconnect();
      theme.disconnect();
      eligible.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", resume);
      systemTheme.removeEventListener("change", updateColors);
      hero.removeEventListener("pointermove", move, pointerOptions);
      hero.removeEventListener("pointerdown", press, pointerOptions);
      hero.removeEventListener("pointerleave", leave);
      hero.removeEventListener("pointercancel", leave, pointerOptions);
      canvas.removeEventListener("contextlost", fallback);
      canvas.removeEventListener("contextrestored", build);
    };
  }, []);

  return (
    <div className={`${styles.wordmark} halftone-wordmark relative h-[clamp(10rem,25vw,23rem)] overflow-hidden font-heading`} aria-hidden="true">
      <span className={`${styles.staticWord} halftone-static-word absolute inset-x-0 bottom-[-0.16em] text-center text-[clamp(7rem,29vw,25rem)] leading-none font-semibold tracking-[-0.065em] select-none`}>
        solace
      </span>
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} pointer-events-none absolute inset-0 size-full`}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

interface Dot {
  originX: number;
  originY: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
}

/**
 * Original Canvas 2D implementation of the interaction used by Kedhareswer
 * Naidu's MIT-licensed 21st.dev Halftone Wordmark Footer: sampled text dots,
 * pointer displacement, and spring return. Links remain ordinary DOM anchors.
 */
export function HalftoneWordmark() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -1000, y: -1000, active: false, ripple: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    let dots: Dot[] = [];
    let visible = true;
    let frame = 0;
    let last = performance.now();

    const build = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(box.width * dpr));
      const height = Math.max(1, Math.round(box.height * dpr));
      canvas.width = width;
      canvas.height = height;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const sample = document.createElement("canvas");
      sample.width = Math.max(1, Math.round(box.width));
      sample.height = Math.max(1, Math.round(box.height));
      const sampleContext = sample.getContext("2d", { willReadFrequently: true });
      if (!sampleContext) return;
      const fontSize = Math.min(box.width * 0.265, box.height * 0.95);
      sampleContext.clearRect(0, 0, sample.width, sample.height);
      sampleContext.fillStyle = "#fff";
      sampleContext.textAlign = "center";
      sampleContext.textBaseline = "alphabetic";
      sampleContext.font = `600 ${fontSize}px Lora, Georgia, serif`;
      sampleContext.fillText("solace", sample.width / 2, sample.height * 0.92);
      const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height).data;
      const gap = box.width < 900 ? 8 : 7;
      const next: Dot[] = [];
      for (let y = 2; y < sample.height; y += gap) {
        for (let x = 2; x < sample.width; x += gap) {
          if ((pixels[(Math.floor(y) * sample.width + Math.floor(x)) * 4 + 3] ?? 0) > 80) {
            next.push({ originX: x, originY: y, x, y, velocityX: 0, velocityY: 0, radius: gap * 0.23 });
          }
        }
      }
      dots = next;
    };

    const draw = (now: number) => {
      if (!visible) return;
      const box = canvas.getBoundingClientRect();
      const deltaTime = Math.min(2.5, (now - last) / 16.67);
      last = now;
      context.clearRect(0, 0, box.width, box.height);
      context.fillStyle = "rgba(225, 237, 231, 0.82)";
      const radius = 92 + pointer.current.ripple;

      for (const dot of dots) {
        const dx = dot.x - pointer.current.x;
        const dy = dot.y - pointer.current.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (pointer.current.active && distance < radius) {
          const force = (1 - distance / radius) * 1.5;
          dot.velocityX += (dx / distance) * force * deltaTime;
          dot.velocityY += (dy / distance) * force * deltaTime;
        }
        dot.velocityX += (dot.originX - dot.x) * 0.045 * deltaTime;
        dot.velocityY += (dot.originY - dot.y) * 0.045 * deltaTime;
        dot.velocityX *= Math.pow(0.82, deltaTime);
        dot.velocityY *= Math.pow(0.82, deltaTime);
        dot.x += dot.velocityX * deltaTime;
        dot.y += dot.velocityY * deltaTime;
        context.beginPath();
        context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        context.fill();
      }
      pointer.current.ripple *= 0.92;
      frame = requestAnimationFrame(draw);
    };

    const resize = new ResizeObserver(build);
    resize.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      cancelAnimationFrame(frame);
      if (visible) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    });
    intersection.observe(canvas);
    build();
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
    };
  }, []);

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    pointer.current.x = event.clientX - box.left;
    pointer.current.y = event.clientY - box.top;
    pointer.current.active = true;
  };

  return (
    <div className="relative h-[clamp(11rem,25vw,21rem)] overflow-hidden" aria-hidden="true">
      <span className="halftone-static-word absolute inset-x-0 bottom-[-0.16em] text-center font-heading text-[clamp(7rem,25vw,21rem)] leading-none font-semibold tracking-[-0.08em] select-none">
        solace
      </span>
      <canvas
        ref={canvasRef}
        onPointerMove={move}
        onPointerLeave={() => { pointer.current.active = false; }}
        onPointerDown={() => { pointer.current.ripple = 70; }}
        className="absolute inset-0 size-full max-md:hidden"
      />
    </div>
  );
}

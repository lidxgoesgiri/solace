"use client";

import dynamic from "next/dynamic";

const LiquidSculptureCanvas = dynamic(
  () => import("@/features/landing/liquid-sculpture-canvas").then((mod) => mod.LiquidSculptureCanvas),
  { ssr: false },
);

/**
 * Server-rendered poster first, optional WebGL2 particle sculpture second.
 * Behaviour adapted from Guglielmo Giannattasio's MIT-licensed 21st.dev
 * Liquid Sculpture Hero. The artwork and shaders below are original to Solace.
 */
export function LiquidSculpture() {
  return (
    <div
      aria-hidden="true"
      className="liquid-sculpture relative isolate mx-auto aspect-[5/4] w-full max-w-[36rem] overflow-hidden rounded-[2rem] border border-white/50 bg-sky-soft shadow-(--shadow-lift)"
    >
      <div className="liquid-poster absolute inset-0" />
      <div className="absolute top-[12%] left-[14%] size-[38%] rounded-[48%_52%_62%_38%] border border-white/55 bg-sage/55 shadow-[inset_0_0_50px_rgb(255_255_255/0.42)]" />
      <div className="absolute right-[10%] bottom-[12%] size-[43%] rounded-[55%_45%_38%_62%] border border-white/55 bg-sky/65 shadow-[inset_0_0_60px_rgb(255_255_255/0.45)]" />
      <div className="absolute top-[34%] left-[37%] size-[30%] rounded-full bg-sun/80 blur-[1px] shadow-[0_18px_70px_rgb(245_215_161/0.55)]" />
      <LiquidSculptureCanvas />
      <div className="absolute inset-x-[13%] bottom-[9%] h-px bg-ink/20" />
    </div>
  );
}

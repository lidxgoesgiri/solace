"use client";

import { m, useAnimationControls, type HTMLMotionProps } from "framer-motion";
import { useEffect, useRef } from "react";
import { LANDING_REVEAL, LANDING_STAGGER } from "@/features/landing/motion";
import { useLandingReducedMotion } from "@/features/landing/motion-preferences";

const TAGS = { div: m.div, section: m.section, ul: m.ul, ol: m.ol, li: m.li } as const;
type RevealTag = keyof typeof TAGS;

interface LandingRevealProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "variants" | "ref"> {
  as?: RevealTag;
  stagger?: boolean;
}

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: LANDING_REVEAL },
};

/**
 * Visible in SSR and without JavaScript. Only offscreen sections are armed
 * after hydration; above-the-fold content and keyboard focus never wait.
 * Kept separate from the flow's motion so crisis/screening remain untouched.
 */
export function LandingReveal({ as = "div", stagger = false, children, ...props }: LandingRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const reducedMotion = useLandingReducedMotion();
  const Tag = TAGS[as] as typeof m.div;

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion || typeof IntersectionObserver === "undefined") {
      controls.set("visible");
      return;
    }
    // Already visible content paints immediately, including restored scroll.
    if (element.getBoundingClientRect().top < window.innerHeight + 24) {
      controls.set("visible");
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      void controls.start("visible").catch(() => controls.set("visible"));
      observer.disconnect();
    }, { threshold: 0.06, rootMargin: "0px 0px 40px 0px" });
    observer.observe(element);
    controls.set("hidden");
    return () => observer.disconnect();
  }, [controls, reducedMotion]);

  return (
    <Tag
      {...props}
      ref={ref}
      initial={false}
      animate={controls}
      variants={stagger ? {
        hidden: {},
        visible: { transition: { staggerChildren: reducedMotion ? 0 : LANDING_STAGGER } },
      } : item}
      onFocusCapture={() => controls.set("visible")}
    >
      {children}
    </Tag>
  );
}

export function LandingRevealItem({ as = "div", ...props }: Omit<LandingRevealProps, "stagger">) {
  const Tag = TAGS[as] as typeof m.div;
  return <Tag {...props} variants={item} />;
}

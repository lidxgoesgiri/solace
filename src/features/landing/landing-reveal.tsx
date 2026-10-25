"use client";

import { m, type HTMLMotionProps } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { LANDING_REVEAL, LANDING_STAGGER } from "@/features/landing/motion";
import { useLandingReducedMotion } from "@/features/landing/motion-preferences";

const TAGS = { div: m.div, section: m.section, ul: m.ul, ol: m.ol, li: m.li } as const;
type RevealTag = keyof typeof TAGS;

interface LandingRevealProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "variants" | "ref"> {
  as?: RevealTag;
  stagger?: boolean;
}

const item = {
  // Hiding happens offscreen, so it is instant; only the reveal is animated.
  hidden: { opacity: 0, y: 18, transition: { duration: 0 } },
  visible: { opacity: 1, y: 0, transition: LANDING_REVEAL },
};

/**
 * Visible in SSR and without JavaScript. Only offscreen sections are hidden
 * after hydration; above-the-fold content and keyboard focus never wait.
 * Kept separate from the flow's motion so crisis/screening remain untouched.
 *
 * The state is a prop, not an imperative command: the animation engine loads
 * after the page (MotionProvider), and a command sent before it arrives was
 * silently dropped, so nothing was ever hidden to reveal.
 */
export function LandingReveal({ as = "div", stagger = false, children, ...props }: LandingRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useLandingReducedMotion();
  const [hidden, setHidden] = useState(false);
  // Once shown (on screen or focused), a section never hides again.
  const revealed = useRef(false);
  const Tag = TAGS[as] as typeof m.div;

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion || typeof IntersectionObserver === "undefined") return;
    // The first callback reports where the section is now: content on screen,
    // or already scrolled past (restored scroll), stays visible.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry || revealed.current) return;
      if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight + 24) {
        revealed.current = true;
        setHidden(false);
        observer.disconnect();
      } else {
        setHidden(true);
      }
    }, { threshold: 0.06, rootMargin: "0px 0px 40px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // Reduced motion always shows the content, whatever the observer decided.
  const state = hidden && !reducedMotion ? "hidden" : "visible";

  return (
    <Tag
      {...props}
      ref={ref}
      initial={false}
      animate={state}
      data-reveal={state}
      variants={stagger ? {
        hidden: {},
        visible: { transition: { staggerChildren: reducedMotion ? 0 : LANDING_STAGGER } },
      } : item}
      onFocusCapture={() => {
        revealed.current = true;
        setHidden(false);
      }}
    >
      {children}
    </Tag>
  );
}

export function LandingRevealItem({ as = "div", ...props }: Omit<LandingRevealProps, "stagger">) {
  const Tag = TAGS[as] as typeof m.div;
  return <Tag {...props} variants={item} />;
}

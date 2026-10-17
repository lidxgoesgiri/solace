"use client";

import { m, type HTMLMotionProps } from "framer-motion";
import { fadeUp, staggerParent } from "@/components/motion/tokens";

type RevealTag = "div" | "section" | "ul" | "ol" | "li";

const TAGS = {
  div: m.div,
  section: m.section,
  ul: m.ul,
  ol: m.ol,
  li: m.li,
} as const;

interface StaggerProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate"> {
  as?: RevealTag;
  /**
   * Wait until the group scrolls into view (below-the-fold content).
   * Otherwise the group reveals as soon as it mounts.
   */
  inView?: boolean;
}

/** A group whose `StaggerItem` children fade up one after another. */
export function Stagger({ as = "div", inView = false, ...props }: StaggerProps) {
  const Tag = TAGS[as] as typeof m.div;
  return (
    <Tag
      variants={staggerParent}
      initial="hidden"
      {...(inView
        ? { whileInView: "show", viewport: { once: true, amount: 0.15 } }
        : { animate: "show" })}
      {...props}
    />
  );
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  as?: RevealTag;
}

export function StaggerItem({ as = "div", ...props }: StaggerItemProps) {
  const Tag = TAGS[as] as typeof m.div;
  return <Tag variants={fadeUp} {...props} />;
}

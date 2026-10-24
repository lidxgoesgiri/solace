"use client";

import { useEffect, useState, type ComponentType } from "react";

/**
 * Loads the decorative cursor spotlight after hydration, and only on devices
 * with a fine pointer, so it stays out of the initial JavaScript of every
 * page (PRD 14 screening budget).
 */
export function LazyCursorSpotlight() {
  const [Spotlight, setSpotlight] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let active = true;
    void import("./cursor-spotlight").then((module) => {
      if (active) setSpotlight(() => module.CursorSpotlight);
    });
    return () => {
      active = false;
    };
  }, []);

  return Spotlight ? <Spotlight /> : null;
}

"use client";

import { useEffect, useRef } from "react";
import type { AnswerValue } from "@/lib/scoring";

interface AnswerKeyHandlers {
  /** Keys 1–4 select answer values 0–3 (SK-02). */
  onSelect: (value: AnswerValue) => void;
  /** Enter moves on, unless focus is on another control that handles Enter. */
  onSubmit: () => void;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

/** Lets the user answer with the keyboard without leaving the question. */
export function useAnswerKeys(handlers: AnswerKeyHandlers) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (isEditable(event.target)) return;

      if (/^[1-4]$/.test(event.key)) {
        event.preventDefault();
        latest.current.onSelect((Number(event.key) - 1) as AnswerValue);
        return;
      }

      if (event.key === "Enter") {
        const target = event.target as HTMLElement | null;
        // Buttons and links already act on Enter; radios do not.
        const isOtherControl =
          target?.closest("a, button") !== null &&
          target?.getAttribute("role") !== "radio";
        if (isOtherControl) return;
        event.preventDefault();
        latest.current.onSubmit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

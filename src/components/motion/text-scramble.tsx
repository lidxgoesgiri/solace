"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

const GLYPHS = "0123456789ABCDEF!@#$%&*+~<>?/";

interface TextScrambleProps {
  text: string;
  duration?: number;
  className?: string;
}

/**
 * Web3 Cryptographic Text Scramble / Decryption Effect.
 * Progressively reveals text with cipher glyphs. Screen readers read a
 * visually hidden copy of the clean text; with reduced motion the clean text
 * shows at once.
 */
export function TextScramble({ text, duration = 500, className }: TextScrambleProps) {
  const reducedMotion = usePrefersReducedMotion();
  // Tagged with the text it scrambles, so a changed text never shows a stale frame.
  const [frame, setFrame] = useState<{ text: string; value: string } | null>(null);

  useEffect(() => {
    if (reducedMotion) return;

    const length = text.length;
    const intervalTime = 30;
    const totalSteps = Math.max(1, Math.floor(duration / intervalTime));
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= totalSteps) {
        clearInterval(interval);
        setFrame(null);
        return;
      }

      const revealedCount = Math.floor((currentStep / totalSteps) * length);
      let scrambled = "";
      for (let i = 0; i < length; i++) {
        if (text[i] === " ") {
          scrambled += " ";
        } else if (i < revealedCount) {
          scrambled += text[i];
        } else {
          scrambled += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      setFrame({ text, value: scrambled });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [text, duration, reducedMotion]);

  const display = !reducedMotion && frame?.text === text ? frame.value : text;

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{display}</span>
    </span>
  );
}

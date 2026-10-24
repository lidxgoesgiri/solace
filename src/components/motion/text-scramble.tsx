"use client";

import { useEffect, useState } from "react";

const GLYPHS = "0123456789ABCDEF!@#$%&*+~<>?/";

interface TextScrambleProps {
  text: string;
  duration?: number;
  className?: string;
}

/**
 * Web3 Cryptographic Text Scramble / Decryption Effect.
 * Progressively reveals text with cipher glyphs.
 * Accessible: Uses aria-label so screen readers announce clean text immediately.
 */
export function TextScramble({ text, duration = 500, className }: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const length = text.length;
    const intervalTime = 30;
    const totalSteps = Math.max(1, Math.floor(duration / intervalTime));
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;
      const revealedCount = Math.floor(progress * length);

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

      setDisplayText(scrambled);

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        setDisplayText(text);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [text, duration]);

  return (
    <span aria-label={text} className={className}>
      <span aria-hidden="true">{displayText}</span>
    </span>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Coffee } from "@/components/icons/coffee";
import { Ear } from "@/components/icons/ear";
import { Eye } from "@/components/icons/eye";
import { Flower2 } from "@/components/icons/flower-2";
import { Hand } from "@/components/icons/hand";

/** 5-4-3-2-1 grounding (TP-06), shared by the crisis screen and the toolkit. */
export function GroundingList() {
  const t = useTranslations("crisis");
  const steps = [
    { icon: Eye, text: t("groundingSee") },
    { icon: Hand, text: t("groundingTouch") },
    { icon: Ear, text: t("groundingHear") },
    { icon: Flower2, text: t("groundingSmell") },
    { icon: Coffee, text: t("groundingTaste") },
  ];
  return (
    <ol className="divide-y divide-border/70">
      {steps.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sage-soft text-sage-ink">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <span className="text-sm leading-relaxed">{text}</span>
        </li>
      ))}
    </ol>
  );
}

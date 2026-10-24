"use client";

import { useTranslations } from "next-intl";
import { Coffee } from "@/components/icons/coffee";
import { Ear } from "@/components/icons/ear";
import { Eye } from "@/components/icons/eye";
import { Flower2 } from "@/components/icons/flower-2";
import { Hand } from "@/components/icons/hand";

export const GROUNDING_STEPS = [
  { icon: Eye, key: "groundingSee", count: 5 },
  { icon: Hand, key: "groundingTouch", count: 4 },
  { icon: Ear, key: "groundingHear", count: 3 },
  { icon: Flower2, key: "groundingSmell", count: 2 },
  { icon: Coffee, key: "groundingTaste", count: 1 },
] as const;

/**
 * 5-4-3-2-1 grounding (TP-06) as a still list for the crisis screen, which
 * never animates. The toolkit on /tips uses `GroundingChecklist`.
 */
export function GroundingList() {
  const t = useTranslations("crisis");
  return (
    <ol className="divide-y divide-border/70">
      {GROUNDING_STEPS.map(({ icon: Icon, key }) => (
        <li key={key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sage-soft text-sage-ink">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <span className="text-sm leading-relaxed">{t(key)}</span>
        </li>
      ))}
    </ol>
  );
}

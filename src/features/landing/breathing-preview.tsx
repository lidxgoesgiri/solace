"use client";

import { useTranslations } from "next-intl";
import { BreathingPacer } from "@/components/breathing-pacer";
import { Wind } from "@/components/icons/wind";

/** The same exercise as the crisis/toolkit pacer, with its own off-by-default opt-in. */
export function BreathingPreview() {
  const t = useTranslations("crisis");
  return (
    <div className="surface flex h-full flex-col gap-6 p-4 sm:p-7" data-testid="landing-breathing">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-soft text-primary">
          <Wind aria-hidden="true" className="size-5" />
        </span>
        <h3 className="text-2xl">{t("breathingTitle")}</h3>
      </div>
      <BreathingPacer />
    </div>
  );
}

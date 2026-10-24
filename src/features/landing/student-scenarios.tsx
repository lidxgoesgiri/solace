"use client";

import { useTranslations } from "next-intl";
import { BookOpen } from "@/components/icons/book-open";
import { Coffee } from "@/components/icons/coffee";
import { HeartHandshake } from "@/components/icons/heart-handshake";
import { Moon } from "@/components/icons/moon";
import { TiltCard } from "@/components/motion/tilt-card";

const SCENARIOS = [
  { key: "academic", icon: BookOpen, glow: "rgba(168, 197, 218, 0.2)" },
  { key: "night", icon: Moon, glow: "rgba(129, 140, 248, 0.2)" },
  { key: "burnout", icon: Coffee, glow: "rgba(245, 215, 161, 0.22)" },
  { key: "social", icon: HeartHandshake, glow: "rgba(181, 201, 183, 0.22)" },
] as const;

export function StudentScenarios() {
  const t = useTranslations("landing.scenarios");

  return (
    <div className="space-y-8" data-testid="student-scenarios">
      <div className="space-y-3">
        <p className="kicker max-w-xs">{t("kicker")}</p>
        <h3 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
          {t("title")}
        </h3>
        <p className="measure text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("intro")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SCENARIOS.map(({ key, icon: Icon, glow }) => (
          <TiltCard
            key={key}
            glowColor={glow}
            className="flex flex-col justify-between p-5"
          >
            <div className="space-y-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-muted/60 text-sage-ink transition-colors group-hover:bg-sage-soft/70">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h4 className="font-heading text-lg font-medium text-foreground">
                {t(`${key}Title`)}
              </h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`${key}Body`)}
              </p>
            </div>

            <div className="pt-4">
              <span className="inline-block rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors group-hover:border-sage-ink/30 group-hover:text-foreground">
                {t(`${key}Tag`)}
              </span>
            </div>
          </TiltCard>
        ))}
      </div>
    </div>
  );
}

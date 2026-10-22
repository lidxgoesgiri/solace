"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

const STEPS = ["understand", "answer", "choose"] as const;

export function InteractiveSteps() {
  const t = useTranslations("landing");
  const [active, setActive] = useState<(typeof STEPS)[number]>("understand");
  const index = STEPS.indexOf(active);

  return (
    <div className="grid overflow-hidden rounded-[1.75rem] border bg-card shadow-(--shadow-soft) lg:grid-cols-[0.82fr_1.18fr]">
      <div
        role="tablist"
        aria-label={t("stepsLabel")}
        className="flex gap-1 overflow-x-auto border-b bg-muted/45 p-2 lg:flex-col lg:justify-center lg:border-r lg:border-b-0 lg:p-5"
      >
        {STEPS.map((step, stepIndex) => (
          <button
            key={step}
            id={`landing-step-${step}`}
            type="button"
            role="tab"
            data-testid={`landing-step-${step}`}
            aria-selected={active === step}
            aria-controls={`landing-panel-${step}`}
            tabIndex={active === step ? 0 : -1}
            onClick={() => setActive(step)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowLeft") return;
              event.preventDefault();
              const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
              const next = STEPS[(stepIndex + direction + STEPS.length) % STEPS.length]!;
              setActive(next);
              document.getElementById(`landing-step-${next}`)?.focus();
            }}
            className={cn(
              "min-h-12 min-w-max rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors sm:text-base lg:min-w-0",
              active === step ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            <span aria-hidden="true" className="mr-3 font-heading text-lg opacity-70">
              0{stepIndex + 1}
            </span>
            {t(`steps.${step}.tab`)}
          </button>
        ))}
      </div>

      {STEPS.map((step, stepIndex) => (
        <div
          key={step}
          id={`landing-panel-${step}`}
          role="tabpanel"
          aria-labelledby={`landing-step-${step}`}
          hidden={active !== step}
          tabIndex={0}
          className="min-h-[22rem] p-6 outline-none sm:p-9 lg:p-12"
        >
          <div className="grid h-full content-between gap-10">
            <div className="space-y-4">
              <p className="kicker kicker-plain">{t("stepsKicker", { current: stepIndex + 1 })}</p>
              <h3 className="max-w-xl text-3xl leading-tight sm:text-4xl">{t(`steps.${step}.title`)}</h3>
              <p className="measure text-lg leading-relaxed text-muted-foreground">{t(`steps.${step}.body`)}</p>
            </div>
            <div aria-hidden="true" className="flex items-center gap-3">
              {STEPS.map((item, dotIndex) => (
                <span
                  key={item}
                  className={cn(
                    "h-2 rounded-full transition-[width,background-color] duration-(--duration-base)",
                    dotIndex === index ? "w-14 bg-primary" : "w-5 bg-border",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

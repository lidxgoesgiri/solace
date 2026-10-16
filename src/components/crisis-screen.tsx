"use client";

import { ArrowRight, Eye, Hand, Ear, Flower2, Coffee } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BreathingPacer } from "@/components/breathing-pacer";
import { CountrySelect, ServiceList } from "@/components/help-directory";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "@/i18n/navigation";
import { PATHS, pathAfterCrisis } from "@/lib/flow";
import { useFlow, useFlowDispatch, useFlowHydrated } from "@/store/flow-store";

/**
 * Full crisis screen (PRD 9.3). It offers several steps, not only numbers,
 * and the continue button only works after the user confirms they have read
 * the page. There is no forced delay. Confirming is the only way to clear
 * crisis_pending (K3).
 */
export function CrisisScreen() {
  const t = useTranslations("crisis");
  const router = useRouter();
  const hydrated = useFlowHydrated();
  const flow = useFlow();
  const dispatch = useFlowDispatch();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const next = hydrated ? pathAfterCrisis(flow) : PATHS.landing;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const onContinue = () => {
    if (!acknowledged) return;
    dispatch({ type: "ACKNOWLEDGE_CRISIS" });
    router.push(next);
  };

  const grounding = [
    { icon: Eye, text: t("groundingSee") },
    { icon: Hand, text: t("groundingTouch") },
    { icon: Ear, text: t("groundingHear") },
    { icon: Flower2, text: t("groundingSmell") },
    { icon: Coffee, text: t("groundingTaste") },
  ];

  const plan = [
    t("planWarningSigns"),
    t("planCoping"),
    t("planDistraction"),
    t("planPeople"),
    t("planProfessionals"),
    t("planSafeEnvironment"),
  ];

  return (
    <section data-testid="crisis-screen" aria-labelledby="crisis-title" className="space-y-10">
      <header className="space-y-3">
        <h1
          id="crisis-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl outline-none sm:text-4xl"
        >
          {t("title")}
        </h1>
        <p className="text-lg">{t("intro")}</p>
        <p className="text-sm text-muted-foreground">{t("privacy")}</p>
      </header>

      <section
        aria-labelledby="crisis-emergency"
        data-testid="crisis-emergency"
        className="space-y-4 rounded-2xl border-2 border-sun bg-sun-soft p-5"
      >
        <div className="space-y-1">
          <h2 id="crisis-emergency" className="text-2xl">
            {t("emergencyTitle")}
          </h2>
          <p>{t("emergencyBody")}</p>
        </div>
        <CountrySelect />
        <ServiceList category="emergency" />
      </section>

      <section aria-labelledby="crisis-talk" data-testid="crisis-talk" className="space-y-4">
        <div className="space-y-1">
          <h2 id="crisis-talk" className="text-2xl">
            {t("talkTitle")}
          </h2>
          <p>{t("talkBody")}</p>
        </div>
        <ServiceList category="support" />
      </section>

      <section aria-labelledby="crisis-calm" data-testid="crisis-calm" className="space-y-4">
        <div className="space-y-1">
          <h2 id="crisis-calm" className="text-2xl">
            {t("calmTitle")}
          </h2>
          <p>{t("calmBody")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-2xl border bg-card p-5">
            <h3 className="text-lg">{t("breathingTitle")}</h3>
            <BreathingPacer />
          </div>
          <div className="space-y-3 rounded-2xl border bg-card p-5" data-testid="grounding">
            <h3 className="text-lg">{t("groundingTitle")}</h3>
            <p className="text-sm">{t("groundingIntro")}</p>
            <ol className="space-y-2">
              {grounding.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-soft">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="crisis-plan" data-testid="crisis-plan" className="space-y-3">
        <h2 id="crisis-plan" className="text-2xl">
          {t("planTitle")}
        </h2>
        <p>{t("planBody")}</p>
        <ul className="list-disc space-y-1 pl-6">
          {plan.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="crisis-trusted" data-testid="crisis-trusted" className="space-y-3">
        <h2 id="crisis-trusted" className="text-2xl">
          {t("trustedTitle")}
        </h2>
        <p>{t("trustedBody")}</p>
        <div className="space-y-2">
          <blockquote className="rounded-xl border-l-4 border-sage bg-sage-soft p-4 font-heading italic">
            {t("trustedExample1")}
          </blockquote>
          <blockquote className="rounded-xl border-l-4 border-sage bg-sage-soft p-4 font-heading italic">
            {t("trustedExample2")}
          </blockquote>
        </div>
      </section>

      <div className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <Checkbox
            id="crisis-ack"
            data-testid="crisis-ack"
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
            className="mt-0.5 size-5"
          />
          <label htmlFor="crisis-ack" className="text-base leading-snug">
            {t("acknowledge")}
          </label>
        </div>
        <Button
          type="button"
          size="lg"
          data-testid="crisis-continue"
          disabled={!acknowledged}
          aria-describedby={acknowledged ? undefined : "crisis-continue-hint"}
          onClick={onContinue}
          className="w-full sm:w-auto"
        >
          {next === PATHS.hasil ? t("continueToResults") : t("continue")}
          <ArrowRight aria-hidden="true" />
        </Button>
        {acknowledged ? null : (
          <p id="crisis-continue-hint" className="text-sm text-muted-foreground">
            {t("continueHint")}
          </p>
        )}
      </div>
    </section>
  );
}

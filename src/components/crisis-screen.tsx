"use client";

import { ArrowRight } from "@/components/icons/arrow-right";
import { ShieldCheck } from "@/components/icons/shield-check";
import { GroundingList } from "@/components/toolkit/grounding-list";
import { useTranslations } from "next-intl";
import { Suspense, lazy, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CountrySelect, ServiceList } from "@/components/help-directory";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useRouter } from "@/i18n/navigation";
import { PATHS, pathAfterCrisis } from "@/lib/flow";
import { useFlow, useFlowDispatch, useFlowHydrated } from "@/store/flow-store";

/**
 * The user's own plan (SP-02) is code-split with React.lazy and rendered
 * only after the crisis screen has mounted, so its code is fetched after
 * the page shows and never adds to the screen's initial JavaScript (Next's
 * own dynamic loader would cost more than this panel on /krisis).
 */
const noSubscribe = () => () => {};

const LazyCrisisPlanPanel = lazy(() =>
  import("@/components/safety-plan/crisis-plan-panel").then((mod) => ({
    default: mod.CrisisPlanPanel,
  })),
);

// Only the optional exercise suspends; emergency actions always render at once.
const LazyBreathingPacer = lazy(() =>
  import("@/components/breathing-pacer").then((mod) => ({ default: mod.BreathingPacer })),
);

/**
 * Full crisis screen (PRD 9.3). It offers several steps, not only numbers,
 * and the continue button only works after the user confirms they have read
 * the page. There is no forced delay. Confirming is the only way to clear
 * crisis_pending (K3).
 */
export function CrisisScreen() {
  const t = useTranslations("crisis");
  const all = useTranslations();
  const router = useRouter();
  const hydrated = useFlowHydrated();
  const flow = useFlow();
  const dispatch = useFlowDispatch();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  // False on the server and during hydration: the lazy panel never renders on the server.
  const mounted = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

  const next = hydrated ? pathAfterCrisis(flow) : PATHS.landing;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const onContinue = () => {
    if (!acknowledged) return;
    dispatch({ type: "ACKNOWLEDGE_CRISIS" });
    router.push(next);
  };

  const plan = [
    t("planWarningSigns"),
    t("planCoping"),
    t("planDistraction"),
    t("planPeople"),
    t("planProfessionals"),
    t("planSafeEnvironment"),
  ];

  return (
    <section
      data-testid="crisis-screen"
      aria-labelledby="crisis-title"
      className="mx-auto max-w-3xl space-y-10 sm:space-y-14"
    >
      <header className="space-y-4 sm:space-y-5">
        <h1
          id="crisis-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-[2.6rem] leading-[1.08] outline-none sm:text-6xl"
        >
          {t("title")}
        </h1>
        <p className="measure text-lg leading-relaxed sm:text-xl">{t("intro")}</p>
        <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
          {t("privacy")}
        </p>
      </header>

      <section
        aria-labelledby="crisis-emergency"
        data-testid="crisis-emergency"
        className="space-y-5 rounded-3xl border border-sun-edge bg-sun-soft p-6 shadow-(--shadow-soft) sm:p-8"
      >
        <div className="space-y-1.5">
          <h2 id="crisis-emergency" className="text-3xl">
            {t("emergencyTitle")}
          </h2>
          <p className="text-lg">{t("emergencyBody")}</p>
        </div>
        <CountrySelect />
        <ServiceList category="emergency" />
      </section>

      <section aria-labelledby="crisis-talk" data-testid="crisis-talk" className="space-y-5">
        <div className="space-y-1.5">
          <h2 id="crisis-talk" className="text-3xl">
            {t("talkTitle")}
          </h2>
          <p className="text-muted-foreground">{t("talkBody")}</p>
        </div>
        <ServiceList category="support" />
      </section>

      <section aria-labelledby="crisis-calm" data-testid="crisis-calm" className="space-y-5">
        <div className="space-y-1.5">
          <h2 id="crisis-calm" className="text-3xl">
            {t("calmTitle")}
          </h2>
          <p className="text-muted-foreground">{t("calmBody")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="surface space-y-4 p-6">
            <h3 className="text-xl">{t("breathingTitle")}</h3>
            <div className="min-h-80">
              {mounted ? (
                <Suspense fallback={<p className="text-center text-sm text-muted-foreground">{t("breathingStatic")}</p>}>
                  <LazyBreathingPacer />
                </Suspense>
              ) : <p className="text-center text-sm text-muted-foreground">{t("breathingStatic")}</p>}
            </div>
          </div>
          <div className="surface space-y-4 p-6" data-testid="grounding">
            <h3 className="text-xl">{t("groundingTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("groundingIntro")}</p>
            <GroundingList />
          </div>
        </div>
      </section>

      <section aria-labelledby="crisis-plan" data-testid="crisis-plan" className="space-y-4">
        <h2 id="crisis-plan" className="text-3xl">
          {t("planTitle")}
        </h2>
        <p className="measure text-muted-foreground">{t("planBody")}</p>
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {plan.map((text) => (
            <li key={text} className="flex items-start gap-3 border-b py-3">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-sage-ink"
              />
              {text}
            </li>
          ))}
        </ul>
        {mounted ? (
          <Suspense fallback={null}>
            <LazyCrisisPlanPanel />
          </Suspense>
        ) : null}
        <Link
          href={PATHS.rencana}
          data-testid="crisis-make-plan"
          className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
        >
          {all("plan.crisisMakePlan")}
        </Link>
      </section>

      <section aria-labelledby="crisis-trusted" data-testid="crisis-trusted" className="space-y-4">
        <h2 id="crisis-trusted" className="text-3xl">
          {t("trustedTitle")}
        </h2>
        <p className="measure text-muted-foreground">{t("trustedBody")}</p>
        <div className="flex flex-col items-start gap-3">
          <blockquote className="max-w-md rounded-3xl rounded-bl-md bg-sage-soft px-5 py-4 font-heading text-lg italic">
            {t("trustedExample1")}
          </blockquote>
          <blockquote className="max-w-md rounded-3xl rounded-bl-md bg-sage-soft px-5 py-4 font-heading text-lg italic">
            {t("trustedExample2")}
          </blockquote>
        </div>
      </section>

      <div className="surface space-y-5 p-6 sm:p-8">
        <div className="flex items-start gap-3.5">
          <Checkbox
            id="crisis-ack"
            data-testid="crisis-ack"
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
            className="mt-0.5"
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

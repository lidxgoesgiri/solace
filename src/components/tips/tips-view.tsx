"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountGate } from "@/components/account/account-gate";
import { useLatestScreening } from "@/components/account/use-latest-screening";
import { BreathingPacer } from "@/components/breathing-pacer";
import { ArrowRight } from "@/components/icons/arrow-right";
import { Info } from "@/components/icons/info";
import { PageLoading } from "@/components/page-loading";
import { ProfessionalHelp } from "@/components/tips/professional-help";
import { TipCard, type TipProgress } from "@/components/tips/tip-card";
import { GroundingList } from "@/components/toolkit/grounding-list";
import { PmrGuide } from "@/components/toolkit/pmr-guide";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { saveRecord } from "@/lib/account/client";
import { flowFromScreeningRecord, scoreRecord } from "@/lib/account/screening";
import type { StoredRecord, TipProgressRecord } from "@/lib/account/types";
import { PATHS, mustShowCrisis } from "@/lib/flow";
import { resultsView } from "@/lib/results";
import { trackEvent } from "@/lib/metrics-client";
import { categoriesOf, selectTips, type Tip } from "@/lib/tips";
import { useAccountRecords } from "@/store/account-store";
import { useFlow } from "@/store/flow-store";

/** /tips: the personal tip plan (TP-01–TP-04) and the toolkit (TP-05–TP-07). */
export function TipsView() {
  return (
    <AccountGate next={PATHS.tips}>{(username) => <TipsPlan username={username} />}</AccountGate>
  );
}

const NO_PROGRESS: TipProgress = { tried: false, helpful: null };

function TipsPlan({ username }: { username: string }) {
  const t = useTranslations("tips");
  const all = useTranslations();
  const format = useFormatter();
  const flow = useFlow();
  const { loading, latest } = useLatestScreening(username);
  const records = useAccountRecords();
  const [progressError, setProgressError] = useState(false);
  const tracked = useRef(false);

  // A saved screening whose crisis screen was never confirmed stays closed (K3).
  const result = useMemo(() => {
    if (!latest || mustShowCrisis(flowFromScreeningRecord(latest))) return null;
    return scoreRecord(latest);
  }, [latest]);
  const plan = useMemo(() => (result ? selectTips(categoriesOf(result)) : null), [result]);

  const progressRecord = records?.find(
    (record): record is StoredRecord<"tip_progress"> => record.kind === "tip_progress",
  );
  const progress = progressRecord?.value.tips ?? {};

  useEffect(() => {
    if (plan && !tracked.current) {
      tracked.current = true;
      trackEvent("tips_opened");
    }
  }, [plan]);

  if (loading) return <PageLoading />;

  if (!latest || !result || !plan) {
    return (
      <section data-testid="tips-no-result" className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-4xl leading-tight sm:text-5xl">{t("noResultTitle")}</h1>
        <p className="measure text-lg text-muted-foreground">{t("noResultBody")}</p>
        <Button asChild size="lg">
          <Link href={PATHS.mulai}>
            {t("startScreening")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    );
  }

  const update = async (tip: Tip, next: TipProgress) => {
    const value: TipProgressRecord = { v: 1, tips: { ...progress, [tip.id]: next } };
    try {
      setProgressError(false);
      await saveRecord("tip_progress", value, progressRecord?.id);
    } catch {
      setProgressError(true);
    }
  };

  const professional = (
    <ProfessionalHelp emphasis={plan.professionalFirst} canReport={resultsView(flow) !== null} />
  );

  return (
    <div className="mx-auto max-w-3xl space-y-12" data-testid="tips-plan" data-mode={plan.mode}>
      <header className="space-y-4">
        <h1 className="text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
        <p className="measure text-lg leading-relaxed text-muted-foreground">
          {t("intro", {
            date: format.dateTime(new Date(latest.completedAt), { dateStyle: "long" }),
          })}
        </p>
      </header>

      {plan.professionalFirst ? professional : null}

      {plan.professionalFirst ? (
        <p
          className="flex items-start gap-3 rounded-2xl border bg-muted/60 p-4 text-sm"
          data-testid="tips-companion"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
          {t("companion")}
        </p>
      ) : null}

      {progressError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {t("progressError")}
        </p>
      ) : null}

      {plan.mode === "wellbeing" ? (
        <section
          aria-labelledby="wellbeing-title"
          className="space-y-5"
          data-testid="tips-wellbeing"
        >
          <div className="space-y-2">
            <h2 id="wellbeing-title" className="text-3xl">
              {t("wellbeingTitle")}
            </h2>
            <p className="measure text-muted-foreground">{t("wellbeingBody")}</p>
          </div>
          {plan.wellbeing.map((tip) => (
            <TipCard
              key={tip.id}
              tip={tip}
              progress={progress[tip.id] ?? NO_PROGRESS}
              onProgress={(next) => update(tip, next)}
            />
          ))}
          <p
            className="flex items-start gap-3 text-sm text-muted-foreground"
            data-testid="tips-rescreen"
          >
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
            {t("rescreen")}
          </p>
        </section>
      ) : (
        plan.groups.map((group) => (
          <section
            key={group.subscale}
            aria-labelledby={`tips-${group.subscale}`}
            className="space-y-5"
            data-testid={`tips-group-${group.subscale}`}
            data-severity={group.severity}
          >
            <h2 id={`tips-${group.subscale}`} className="text-3xl">
              {t("groupTitle", {
                subscale: all(`subscaleInline.${group.subscale}`),
                severity: all(`severityInline.${group.severity}`),
              })}
            </h2>
            {group.tips.map((tip) => (
              <TipCard
                key={tip.id}
                tip={tip}
                progress={progress[tip.id] ?? NO_PROGRESS}
                onProgress={(next) => update(tip, next)}
              />
            ))}
          </section>
        ))
      )}

      {plan.professionalFirst ? null : professional}

      <section
        aria-labelledby="toolkit-title"
        className="space-y-5 border-t pt-12"
        data-testid="toolkit"
      >
        <div className="space-y-2">
          <h2 id="toolkit-title" className="text-3xl">
            {t("toolkitTitle")}
          </h2>
          <p className="text-muted-foreground">{t("toolkitIntro")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="surface space-y-4 p-6" data-testid="toolkit-breathing">
            <h3 className="text-xl">{all("crisis.breathingTitle")}</h3>
            <BreathingPacer />
          </div>
          <div className="surface space-y-4 p-6" data-testid="toolkit-grounding">
            <h3 className="text-xl">{all("crisis.groundingTitle")}</h3>
            <p className="text-sm text-muted-foreground">{all("crisis.groundingIntro")}</p>
            <GroundingList />
          </div>
        </div>
        <div className="surface space-y-4 p-6">
          <h3 className="text-xl">{t("pmrTitle")}</h3>
          <PmrGuide />
        </div>
      </section>
    </div>
  );
}

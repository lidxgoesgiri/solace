"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { AccountGate } from "@/components/account/account-gate";
import { useLatestScreening } from "@/components/account/use-latest-screening";
import { BreathingPacer } from "@/components/breathing-pacer";
import { ArrowRight } from "@/components/icons/arrow-right";
import { Info } from "@/components/icons/info";
import { PageLoading } from "@/components/page-loading";
import { ProfessionalHelp } from "@/components/tips/professional-help";
import { TipCard, type TipProgress } from "@/components/tips/tip-card";
import { GroundingChecklist } from "@/components/toolkit/grounding-checklist";
import { PmrGuide } from "@/components/toolkit/pmr-guide";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { saveRecord } from "@/lib/account/client";
import { isLocale } from "@/lib/content";
import { flowFromScreeningRecord, scoreRecord } from "@/lib/account/screening";
import type { StoredRecord, TipProgressRecord } from "@/lib/account/types";
import { PATHS, mustShowCrisis } from "@/lib/flow";
import { resultsView } from "@/lib/results";
import { trackEvent } from "@/lib/metrics-client";
import {
  TIPS,
  alternativesFor,
  categoriesOf,
  choicesFromProgress,
  replaceTip,
  restoreTip,
  selectTips,
  slotOf,
  type Tip,
} from "@/lib/tips";
import { useAccountRecords } from "@/store/account-store";
import { useFlow } from "@/store/flow-store";

/** Loaded only when the AI is switched on. */
const LazyTipAiPick = lazy(() =>
  import("@/components/tips/tip-ai-pick").then((mod) => ({ default: mod.TipAiPick })),
);

interface AiInfo {
  available: boolean;
  model: string | null;
  fallbackModel?: string | null;
}

/** /tips: the personal tip plan (TP-01–TP-04) and the toolkit (TP-05–TP-07). */
export function TipsView({ ai }: { ai: AiInfo }) {
  return (
    <AccountGate next={PATHS.tips}>
      {(username) => <TipsPlan username={username} ai={ai} />}
    </AccountGate>
  );
}

const NO_PROGRESS: TipProgress = { tried: false, helpful: null };

function TipsPlan({ username, ai }: { username: string; ai: AiInfo }) {
  const t = useTranslations("tips");
  const all = useTranslations();
  const format = useFormatter();
  const appLocale = useLocale();
  const locale = isLocale(appLocale) ? appLocale : "id";
  const flow = useFlow();
  const { loading, latest } = useLatestScreening(username);
  const records = useAccountRecords();
  const [progressError, setProgressError] = useState(false);
  const [swapStatus, setSwapStatus] = useState("");
  const focusTip = useRef<string | null>(null);
  const tracked = useRef(false);

  // A saved screening whose crisis screen was never confirmed stays closed (K3).
  const result = useMemo(() => {
    if (!latest || mustShowCrisis(flowFromScreeningRecord(latest))) return null;
    return scoreRecord(latest);
  }, [latest]);

  const progressRecord = records?.find(
    (record): record is StoredRecord<"tip_progress"> => record.kind === "tip_progress",
  );
  const progress: Record<string, TipProgress> = progressRecord?.value.tips ?? {};
  // The user's swaps (TP-04) shape the plan, within the same rules (K10).
  const choices = choicesFromProgress(progress);
  const categories = result ? categoriesOf(result) : null;
  const plan = categories ? selectTips(categories, TIPS, choices) : null;

  useEffect(() => {
    if (plan && !tracked.current) {
      tracked.current = true;
      trackEvent("tips_opened");
    }
  }, [plan]);

  // After a swap, focus moves to the tip that is now shown, once it renders.
  useEffect(() => {
    if (!focusTip.current) return;
    const heading = document.getElementById(`tip-${focusTip.current}-title`);
    if (heading) {
      heading.focus();
      focusTip.current = null;
    }
  });

  if (loading) return <PageLoading />;

  if (!latest || !result || !plan || !categories) {
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

  const save = async (tips: Record<string, TipProgress>): Promise<boolean> => {
    const value: TipProgressRecord = { v: 1, tips };
    try {
      setProgressError(false);
      await saveRecord("tip_progress", value, progressRecord?.id);
      return true;
    } catch {
      setProgressError(true);
      return false;
    }
  };

  const update = (tip: Tip, next: TipProgress) => save({ ...progress, [tip.id]: next });

  /** Puts `replacement` where `tip` was, in the same section. */
  const swap = async (tip: Tip, replacement: Tip) => {
    const slot = slotOf(plan, tip.id);
    if (!slot) return;
    if (await save(replaceTip(progress, tip.id, replacement.id, slot))) {
      setSwapStatus(t("swapped", { old: tip.title[locale], new: replacement.title[locale] }));
      focusTip.current = replacement.id;
    }
  };

  const restore = async (tip: Tip) => {
    if (await save(restoreTip(progress, tip.id))) {
      setSwapStatus(t("restored", { title: tip.title[locale] }));
      focusTip.current = tip.id;
    }
  };

  const card = (tip: Tip) => {
    const alternatives = alternativesFor(tip.id, categories, choices);
    const [alternative] = alternatives;
    return (
      <TipCard
        key={tip.id}
        tip={tip}
        progress={progress[tip.id] ?? NO_PROGRESS}
        onProgress={(next) => update(tip, next)}
        onReplace={alternative ? () => swap(tip, alternative) : undefined}
      >
        {ai.available && alternative ? (
          <Suspense fallback={null}>
            <LazyTipAiPick
              tip={tip}
              candidates={alternatives}
              ai={ai}
              username={username}
              onUse={(replacement) => swap(tip, replacement)}
            />
          </Suspense>
        ) : null}
      </TipCard>
    );
  };

  const replacedTips = TIPS.filter((tip) => choices.replaced.has(tip.id));

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
          {plan.wellbeing.map(card)}
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
            {group.tips.map(card)}
          </section>
        ))
      )}

      <p role="status" aria-live="polite" className="sr-only" data-testid="tips-swap-status">
        {swapStatus}
      </p>

      {replacedTips.length > 0 ? (
        <section
          aria-labelledby="tips-replaced-title"
          className="space-y-3 rounded-2xl border p-5"
          data-testid="tips-replaced"
        >
          <h2 id="tips-replaced-title" className="text-xl">
            {t("replacedTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("replacedBody")}</p>
          <ul className="space-y-2">
            {replacedTips.map((tip) => (
              <li key={tip.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{tip.title[locale]}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => restore(tip)}
                  data-testid={`tip-restore-${tip.id}`}
                >
                  {t("restore")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
        <div className="grid items-stretch gap-5 md:grid-cols-2">
          <div className="surface space-y-6 p-4 sm:p-6" data-testid="toolkit-breathing">
            <h3 className="text-2xl">{all("crisis.breathingTitle")}</h3>
            <BreathingPacer />
          </div>
          <div className="surface space-y-6 p-4 sm:p-6" data-testid="toolkit-grounding">
            <h3 className="text-2xl">{all("crisis.groundingTitle")}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{all("crisis.groundingIntro")}</p>
            <GroundingChecklist />
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

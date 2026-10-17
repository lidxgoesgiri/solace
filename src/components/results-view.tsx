"use client";

import { Download, Info, Sparkles } from "@/components/icons";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { HelpDirectory } from "@/components/help-directory";
import { MotionProvider } from "@/components/motion/motion-provider";
import { Stagger } from "@/components/motion/reveal";
import { ResultCard } from "@/components/result-card";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { PATHS, resultsView } from "@/lib/flow";
import { SUBSCALES } from "@/lib/scoring";
import { useFlow, useFlowDispatch } from "@/store/flow-store";

/**
 * Results page (HS-01–HS-07). Rendered only after the flow guard has
 * confirmed that the screening is finished and no crisis is pending.
 */
export function ResultsView() {
  const t = useTranslations("results");
  const router = useRouter();
  const flow = useFlow();
  const dispatch = useFlowDispatch();
  const [confirmClear, setConfirmClear] = useState(false);

  const view = resultsView(flow);
  if (!view) return null;
  const { result, showPriorityPanel, showSupportFirst } = view;

  const clearDevice = () => {
    dispatch({ type: "CLEAR_DEVICE_DATA" });
    router.push(PATHS.landing);
  };

  return (
    <MotionProvider>
      <div className="mx-auto max-w-4xl space-y-14" data-testid="results">
        {showPriorityPanel ? (
          <section
            data-testid="priority-panel"
            aria-labelledby="priority-title"
            className="space-y-5 rounded-3xl border border-sev-extreme-edge bg-sev-extreme p-6 text-ink shadow-(--shadow-soft) sm:p-8"
          >
            <h2 id="priority-title" className="text-3xl">
              {t("priorityTitle")}
            </h2>
            <p className="measure text-lg leading-relaxed">{t("priorityBody")}</p>
            <Button asChild>
              <Link href={PATHS.laporan} data-testid="priority-download-report">
                <Download aria-hidden="true" />
                {t("downloadReport")}
              </Link>
            </Button>
            <HelpDirectory />
          </section>
        ) : showSupportFirst ? (
          <section
            data-testid="support-panel"
            aria-labelledby="support-title"
            className="space-y-5 rounded-3xl border border-sky bg-sky-soft p-6 shadow-(--shadow-soft) sm:p-8"
          >
            <h2 id="support-title" className="text-3xl">
              {t("supportTitle")}
            </h2>
            <p className="measure text-lg leading-relaxed">{t("supportBody")}</p>
            <HelpDirectory />
          </section>
        ) : null}

        <div className="space-y-6">
          <header className="space-y-3">
            <h1 className="text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
            <p className="font-heading text-xl text-sage-ink italic">{t("thanks")}</p>
          </header>

          <Stagger className="space-y-4">
            {SUBSCALES.map((subscale) => (
              <ResultCard key={subscale} subscale={subscale} result={result[subscale]} />
            ))}
          </Stagger>
        </div>

        <section aria-labelledby="next-steps-title" className="space-y-6">
          <p
            data-testid="disclaimer"
            className="flex gap-3 rounded-2xl border bg-muted/70 p-5 text-sm leading-relaxed"
          >
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sage-ink" />
            <span>{t("disclaimer")}</span>
          </p>
          <h2 id="next-steps-title" className="text-3xl">
            {t("nextStepsTitle")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg">
              <Link href={PATHS.laporan} data-testid="download-report">
                <Download aria-hidden="true" />
                {t("downloadReport")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={PATHS.tips} data-testid="continue-to-tips">
                <Sparkles aria-hidden="true" />
                {t("continueToTips")}
              </Link>
            </Button>
          </div>
        </section>

        {showSupportFirst ? null : (
          <section aria-labelledby="directory-title" className="space-y-5 border-t pt-12">
            <h2 id="directory-title" className="text-3xl">
              {t("directoryTitle")}
            </h2>
            <HelpDirectory />
          </section>
        )}

        <section aria-labelledby="device-title" className="surface space-y-3 p-6 sm:p-8">
          <h2 id="device-title" className="text-2xl">
            {t("deviceTitle")}
          </h2>
          <p className="measure text-muted-foreground">{t("deviceBody")}</p>
          {confirmClear ? (
            <div className="space-y-3" role="group" aria-labelledby="clear-question">
              <p id="clear-question" className="font-medium">
                {t("clearDeviceQuestion")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  data-testid="clear-device-data-confirm"
                  onClick={clearDevice}
                >
                  {t("clearDeviceConfirm")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmClear(false)}>
                  {t("clearDeviceCancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              data-testid="clear-device-data"
              onClick={() => setConfirmClear(true)}
            >
              {t("clearDevice")}
            </Button>
          )}
        </section>

        <p className="measure text-xs leading-relaxed text-muted-foreground">
          {t("instrumentNote")}
        </p>
      </div>
    </MotionProvider>
  );
}

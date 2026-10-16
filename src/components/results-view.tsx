"use client";

import { Download, Info, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { HelpDirectory } from "@/components/help-directory";
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
    <div className="space-y-10" data-testid="results">
      {showPriorityPanel ? (
        <section
          data-testid="priority-panel"
          aria-labelledby="priority-title"
          className="space-y-4 rounded-2xl border-2 border-sev-extreme-edge bg-sev-extreme p-5 text-ink"
        >
          <h2 id="priority-title" className="text-2xl">
            {t("priorityTitle")}
          </h2>
          <p>{t("priorityBody")}</p>
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
          className="space-y-4 rounded-2xl border bg-sky-soft p-5"
        >
          <h2 id="support-title" className="text-2xl">
            {t("supportTitle")}
          </h2>
          <p>{t("supportBody")}</p>
          <HelpDirectory />
        </section>
      ) : null}

      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("thanks")}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {SUBSCALES.map((subscale) => (
          <ResultCard key={subscale} subscale={subscale} result={result[subscale]} />
        ))}
      </div>

      <section aria-labelledby="next-steps-title" className="space-y-4">
        <p
          data-testid="disclaimer"
          className="flex gap-3 rounded-xl border bg-muted p-4 text-sm"
        >
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>{t("disclaimer")}</span>
        </p>
        <h2 id="next-steps-title" className="text-2xl">
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
        <section aria-labelledby="directory-title" className="space-y-4">
          <h2 id="directory-title" className="text-2xl">
            {t("directoryTitle")}
          </h2>
          <HelpDirectory />
        </section>
      )}

      <section aria-labelledby="device-title" className="space-y-3 rounded-2xl border bg-card p-5">
        <h2 id="device-title" className="text-xl">
          {t("deviceTitle")}
        </h2>
        <p className="text-sm">{t("deviceBody")}</p>
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

      <p className="text-xs text-muted-foreground">{t("instrumentNote")}</p>
    </div>
  );
}

"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AccountGate } from "@/components/account/account-gate";
import { useLatestScreening } from "@/components/account/use-latest-screening";
import { useSelectedCountry } from "@/components/help-directory";
import { CheckinCard } from "@/components/history/checkin-card";
import { TrendChart, type TrendPoint } from "@/components/history/trend-chart";
import { ArrowRight } from "@/components/icons/arrow-right";
import { CalendarClock } from "@/components/icons/calendar-clock";
import { Download } from "@/components/icons/download";
import { PageLoading } from "@/components/page-loading";
import { ProfessionalHelp } from "@/components/tips/professional-help";
import { reportDateFormatters } from "@/components/use-report-translator";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { flowFromScreeningRecord, scoreRecord } from "@/lib/account/screening";
import type { StoredRecord } from "@/lib/account/types";
import { isLocale } from "@/lib/content";
import { PATHS } from "@/lib/flow";
import { resultsView } from "@/lib/results";
import { newlySevere, reminderDue, snoozeUntil, trendBetween } from "@/lib/history";
import { loadRendererOnIntent, preloadReportRenderer, renderReport, saveFile, scheduleReportRenderer } from "@/lib/report/client";
import { buildReportLabels } from "@/lib/report/labels";
import { buildReportModel, generateReportCode } from "@/lib/report/model";
import { SUBSCALES, type Dass21Result } from "@/lib/scoring";
import { useAccountRecords } from "@/store/account-store";

const SNOOZE_KEY = "solace-reminder-snooze";

// The snooze date is the only thing stored on the device here; it holds no
// health information.
const snoozeStore = {
  subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  },
  get: () => window.localStorage.getItem(SNOOZE_KEY),
  set(value: string) {
    window.localStorage.setItem(SNOOZE_KEY, value);
    window.dispatchEvent(new StorageEvent("storage", { key: SNOOZE_KEY }));
  },
};

/** /riwayat (RW-01–RW-05, PDF-04). Needs an account and is crisis-gated (K3). */
export function HistoryView() {
  return (
    <AccountGate next={PATHS.riwayat}>{(username) => <History username={username} />}</AccountGate>
  );
}

interface Scored {
  record: StoredRecord<"screening">;
  result: Dass21Result;
}

function History({ username }: { username: string }) {
  const t = useTranslations("history");
  const all = useTranslations();
  const format = useFormatter();
  const locale = useLocale();
  const { loading, history } = useLatestScreening(username);
  const records = useAccountRecords();
  const snoozed = useSyncExternalStore(snoozeStore.subscribe, snoozeStore.get, () => null);

  const [engineReady, setEngineReady] = useState(false);
  useEffect(() => scheduleReportRenderer(() => setEngineReady(true)), []);

  // Only screenings whose results may be shown (a saved positive safety
  // answer without a confirmed crisis screen never is, K3).
  const scored: Scored[] = useMemo(
    () =>
      history.flatMap((record) => {
        if (!resultsView(flowFromScreeningRecord(record.value))) return [];
        const result = scoreRecord(record.value);
        return result ? [{ record, result }] : [];
      }),
    [history],
  );
  const checkins = useMemo(
    () => (records ?? []).filter((r): r is StoredRecord<"checkin"> => r.kind === "checkin"),
    [records],
  );

  if (loading) return <PageLoading />;

  const latest = scored.at(-1) ?? null;
  const previous = scored.at(-2) ?? null;
  const now = new Date();
  const showReminder = reminderDue(latest?.record.value.completedAt ?? null, now, snoozed);
  const worse = latest && previous ? newlySevere(previous.result, latest.result) : [];
  const trend = latest && previous ? trendBetween(previous.result, latest.result) : null;
  const inline = (subscale: (typeof SUBSCALES)[number]) => all(`subscaleInline.${subscale}`);
  const severityInline = (severity: string) =>
    all(`severityInline.${severity}` as "severityInline.mild");
  const shortDate = (iso: string) =>
    format.dateTime(new Date(iso), { day: "numeric", month: "short" });

  return (
    <div className="mx-auto max-w-4xl space-y-12" data-testid="history">
      <header className="space-y-3">
        <h1 className="text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
        <p className="measure text-muted-foreground">{t("intro")}</p>
      </header>

      {showReminder && latest ? (
        <section
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-sky bg-sky-soft p-5"
          data-testid="rescreen-reminder"
        >
          <CalendarClock aria-hidden="true" className="size-6 shrink-0 text-primary" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-heading text-xl">
              {t("reminderTitle", {
                days: Math.floor(
                  (now.getTime() - Date.parse(latest.record.value.completedAt)) / 86_400_000,
                ),
              })}
            </p>
            <p className="text-sm">{t("reminderBody")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={PATHS.mulai}>{t("reminderStart")}</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => snoozeStore.set(snoozeUntil(new Date()))}
              data-testid="rescreen-later"
            >
              {t("reminderLater")}
            </Button>
          </div>
        </section>
      ) : null}

      {worse.length > 0 ? (
        <div className="space-y-3" data-testid="worsening-warning">
          <p className="font-heading text-2xl">{t("worseTitle")}</p>
          <p className="measure">
            {t("worseBody", {
              subscales: new Intl.ListFormat(locale, { type: "conjunction" }).format(
                worse.map(inline),
              ),
            })}
          </p>
          <ProfessionalHelp emphasis canReport={false} />
        </div>
      ) : null}

      {scored.length === 0 ? (
        <section className="space-y-4" data-testid="history-empty">
          <h2 className="text-3xl">{t("emptyTitle")}</h2>
          <p className="text-muted-foreground">{t("emptyBody")}</p>
          <Button asChild>
            <Link href={PATHS.mulai}>
              {t("startScreening")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      ) : (
        <>
          <section aria-labelledby="trend-title" className="space-y-4">
            <h2 id="trend-title" className="text-3xl">
              {t("trendTitle")}
            </h2>
            {trend ? (
              <ul className="space-y-1.5" data-testid="trend-feedback">
                {SUBSCALES.map((subscale) => {
                  const change = trend[subscale];
                  const key =
                    change.direction === "up"
                      ? "trendUp"
                      : change.direction === "down"
                        ? "trendDown"
                        : "trendSame";
                  return (
                    <li
                      key={subscale}
                      data-direction={change.direction}
                      data-testid={`trend-${subscale}`}
                    >
                      {t(key, {
                        subscale: inline(subscale),
                        from: severityInline(change.from),
                        to: severityInline(change.to),
                      })}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground">{t("trendOnlyOne")}</p>
            )}
            <p className="text-sm text-muted-foreground">{t("chartBands")}</p>
            <div className="grid gap-4 md:grid-cols-3">
              {SUBSCALES.map((subscale) => {
                const points: TrendPoint[] = scored.map(({ record, result }) => ({
                  at: record.value.completedAt,
                  score: result[subscale].score,
                  severity: result[subscale].severity,
                }));
                const last = points.at(-1)!;
                return (
                  <TrendChart
                    key={subscale}
                    subscale={subscale}
                    points={points}
                    title={all(`subscale.${subscale}`)}
                    summary={t("chartSummary", {
                      subscale: inline(subscale),
                      count: points.length,
                      score: last.score,
                      severity: severityInline(last.severity),
                    })}
                    formatShortDate={shortDate}
                  />
                );
              })}
            </div>
          </section>

          <section aria-labelledby="list-title" className="space-y-4">
            <h2 id="list-title" className="text-3xl">
              {t("listTitle")}
            </h2>
            <p className="text-sm text-muted-foreground sm:hidden">{t("tableHint")}</p>
            <div className="max-w-full overflow-x-auto rounded-xl" role="region" aria-labelledby="list-title" tabIndex={0}>
              <table className="w-full text-left text-sm" data-testid="history-table">
                <caption className="sr-only">{t("tableTitle")}</caption>
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      {t("colDate")}
                    </th>
                    {SUBSCALES.map((subscale) => (
                      <th key={subscale} scope="col" className="py-2 pr-3 font-medium">
                        {all(`subscale.${subscale}`)}
                      </th>
                    ))}
                    <th scope="col" className="py-2 font-medium">
                      <span className="sr-only">{t("download")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...scored].reverse().map((entry) => (
                    <HistoryRow key={entry.record.id} entry={entry} engineReady={engineReady} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <CheckinCard checkins={checkins} />
    </div>
  );
}

function HistoryRow({ entry, engineReady }: { entry: Scored; engineReady: boolean }) {
  const t = useTranslations("history");
  const all = useTranslations();
  const format = useFormatter();
  const appLocale = useLocale();
  const locale = isLocale(appLocale) ? appLocale : "id";
  const country = useSelectedCountry();
  const [status, setStatus] = useState<"idle" | "busy" | "error" | { fileName: string }>("idle");
  const { record, result } = entry;

  /** PDF-04: the same model and renderer as /laporan, from the saved answers (K8). */
  const download = async () => {
    setStatus("busy");
    try {
      const flow = flowFromScreeningRecord(record.value);
      const model = buildReportModel(flow, result, {
        locale,
        country,
        nickname: "",
        includeSafety: true,
        code: generateReportCode(),
      });
      const { formatDateTime, formatDate } = reportDateFormatters(locale);
      const labels = buildReportLabels({
        t: (key, values) => all(key as Parameters<typeof all>[0], values as never),
        country,
        formatDateTime,
        formatDate,
        now: new Date(),
      });
      const { bytes } = await renderReport(model, labels);
      saveFile(bytes, model.fileName);
      setStatus({ fileName: model.fileName });
    } catch {
      setStatus("error");
    }
  };

  return (
    <tr className="border-b align-top" data-testid={`history-row-${record.id}`}>
      <th scope="row" className="py-3 pr-3 font-medium whitespace-nowrap">
        {format.dateTime(new Date(record.value.completedAt), { dateStyle: "medium" })}
      </th>
      {SUBSCALES.map((subscale) => (
        <td
          key={subscale}
          className="py-3 pr-3"
          data-testid={`history-${subscale}`}
          data-score={result[subscale].score}
          data-severity={result[subscale].severity}
        >
          <span className="numeral">{result[subscale].score}</span>{" "}
          <span className="text-muted-foreground">
            · {all(`severity.${result[subscale].severity}`)}
          </span>
        </td>
      ))}
      <td className="py-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={status === "busy"}
          aria-disabled={!engineReady || undefined}
          onClick={() => (engineReady ? download() : void preloadReportRenderer().catch(() => {}))}
          data-testid="history-download"
          className="aria-disabled:cursor-progress aria-disabled:opacity-60"
          {...loadRendererOnIntent}
        >
          <Download aria-hidden="true" />
          {status === "busy" ? t("downloading") : engineReady ? t("download") : t("preparing")}
        </Button>
        <p role="status" aria-live="polite" className="mt-1 text-xs text-muted-foreground">
          {typeof status === "object"
            ? t("downloaded", { fileName: status.fileName })
            : status === "error"
              ? t("downloadError")
              : null}
        </p>
      </td>
    </tr>
  );
}

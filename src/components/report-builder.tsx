"use client";

import { ArrowLeft, Download, Info, Lock } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { useSelectedCountry } from "@/components/help-directory";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/i18n/navigation";
import { isLocale, type Locale } from "@/lib/content";
import { PATHS, resultsView } from "@/lib/flow";
import {
  NICKNAME_MAX_LENGTH,
  buildReportModel,
  generateReportCode,
  type ReportModel,
} from "@/lib/report/model";
import { buildReportLabels } from "@/lib/report/labels";
import { renderReportPdf } from "@/lib/report/pdf";
import { useFlow } from "@/store/flow-store";

type Status =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "done"; fileName: string; code: string }
  | { kind: "error" };

/** Saves bytes as a file without any network request (PDF-01). */
function saveFile(bytes: Uint8Array, fileName: string) {
  // Copy into a plain ArrayBuffer-backed view, as Blob expects.
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Report for a psychologist (PRD 12, PDF-01, PDF-02, PDF-04). The preview
 * and the PDF are built from the same model, which takes its scores from
 * the same `resultsView` the results page uses (K8).
 */
export function ReportBuilder() {
  const t = useTranslations("report");
  const all = useTranslations();
  const countries = useTranslations("countries");
  const format = useFormatter();
  const appLocale = useLocale();
  const locale: Locale = isLocale(appLocale) ? appLocale : "id";
  const flow = useFlow();
  const country = useSelectedCountry();
  const nicknameId = useId();

  const [nickname, setNickname] = useState("");
  const [includeSafety, setIncludeSafety] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const view = resultsView(flow);

  const preview: ReportModel | null = useMemo(
    () =>
      view
        ? buildReportModel(flow, view.result, {
            locale,
            country,
            nickname,
            includeSafety,
            code: "",
          })
        : null,
    [flow, view, locale, country, nickname, includeSafety],
  );

  if (!view || !preview) return null;

  const formatDateTime = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "long", timeStyle: "short" });

  const labels = () =>
    buildReportLabels({
      t: (key, values) => all(key as Parameters<typeof all>[0], values),
      country,
      formatDateTime,
      formatDate: (iso) => format.dateTime(new Date(iso), { dateStyle: "long" }),
      now: new Date(),
    });

  const download = async () => {
    setStatus({ kind: "working" });
    try {
      const code = generateReportCode();
      const model = buildReportModel(flow, view.result, {
        locale,
        country,
        nickname,
        includeSafety,
        code,
      });
      const { bytes } = await renderReportPdf(model, labels());
      saveFile(bytes, model.fileName);
      setStatus({ kind: "done", fileName: model.fileName, code });
    } catch {
      setStatus({ kind: "error" });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10" data-testid="report-page">
      <header className="space-y-4">
        <h1 className="text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
        <p>{t("intro")}</p>
        <p className="flex gap-2 text-sm text-muted-foreground">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
          <span>{t("privacy")}</span>
        </p>
      </header>

      <section aria-labelledby="report-options" className="surface space-y-6 p-6 sm:p-8">
        <h2 id="report-options" className="text-2xl">
          {t("optionsTitle")}
        </h2>
        <div className="space-y-1.5">
          <label htmlFor={nicknameId} className="block text-sm font-medium">
            {t("nicknameLabel")}
          </label>
          <input
            id={nicknameId}
            data-testid="report-nickname"
            type="text"
            autoComplete="off"
            maxLength={NICKNAME_MAX_LENGTH}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            aria-describedby={`${nicknameId}-hint`}
            className="block min-h-11 w-full max-w-sm rounded-xl border border-input bg-background px-3.5 text-base transition-colors hover:border-ink/60"
          />
          <p id={`${nicknameId}-hint`} className="text-sm text-muted-foreground">
            {t("nicknameHint")}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="report-include-safety"
            data-testid="report-include-safety"
            checked={includeSafety}
            onCheckedChange={(checked) => setIncludeSafety(checked === true)}
            aria-describedby="report-include-safety-hint"
            className="mt-0.5 size-5"
          />
          <div className="space-y-1">
            <label htmlFor="report-include-safety" className="text-base font-medium leading-snug">
              {t("includeSafetyLabel")}
            </label>
            <p id="report-include-safety-hint" className="text-sm text-muted-foreground">
              {t("includeSafetyHint")}
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="report-preview-title"
        data-testid="report-preview"
        className="space-y-5 rounded-md border bg-white p-6 text-ink shadow-(--shadow-lift) sm:p-10"
      >
        <h2 id="report-preview-title" className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t("previewTitle")}
        </h2>
        <p className="font-heading text-2xl">{t("pdf.docTitle")}</p>
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
          <dt className="font-medium text-muted-foreground">{t("pdf.screenedAt")}</dt>
          <dd data-testid="report-screened-at">
            {preview.completedAt ? formatDateTime(preview.completedAt) : t("pdf.notRecorded")}
          </dd>
          <dt className="font-medium text-muted-foreground">{t("pdf.instrumentLanguage")}</dt>
          <dd>
            {preview.instrumentLocale
              ? t(`languageName.${preview.instrumentLocale}`)
              : t("pdf.notRecorded")}
          </dd>
          <dt className="font-medium text-muted-foreground">{t("pdf.reportCode")}</dt>
          <dd>{t("codeLater")}</dd>
          {preview.nickname ? (
            <>
              <dt className="font-medium text-muted-foreground">{t("pdf.nickname")}</dt>
              <dd data-testid="report-nickname-preview">{preview.nickname}</dd>
            </>
          ) : null}
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm" data-testid="report-scores">
            <caption className="mb-2 text-left font-heading text-lg">{t("pdf.summaryTitle")}</caption>
            <thead>
              <tr className="border-b border-ink text-muted-foreground">
                <th scope="col" className="py-1.5 pr-2 align-bottom font-medium sm:pr-3">{t("pdf.colDimension")}</th>
                <th scope="col" className="py-1.5 pr-2 align-bottom font-medium sm:pr-3">{t("pdf.colRaw")}</th>
                <th scope="col" className="py-1.5 pr-2 align-bottom font-medium sm:pr-3">{t("pdf.colScore")}</th>
                <th scope="col" className="py-1.5 align-bottom font-medium">{t("pdf.colCategory")}</th>
              </tr>
            </thead>
            <tbody>
              {preview.scores.map((row) => (
                <tr
                  key={row.subscale}
                  className="border-b"
                  data-testid={`report-score-${row.subscale}`}
                  data-raw={row.raw}
                  data-score={row.score}
                  data-severity={row.severity}
                >
                  <th scope="row" className="py-2 pr-2 font-semibold sm:pr-3">
                    {all(`subscale.${row.subscale}`)}
                  </th>
                  <td className="py-2 pr-2 sm:pr-3">{row.raw}</td>
                  <td className="py-2 pr-2 sm:pr-3">{row.score}</td>
                  <td className="py-2 font-semibold">{all(`severity.${row.severity}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {preview.safety ? (
          <div className="space-y-1 text-sm" data-testid="report-safety">
            <p className="font-heading text-lg">{t("pdf.safetyTitle")}</p>
            <p>
              <span className="font-medium text-muted-foreground">{t("pdf.safetyAnswer")}: </span>
              {preview.safety.answer} – {preview.safety.optionLabel}
            </p>
            <p>
              <span className="font-medium text-muted-foreground">{t("pdf.crisisShown")}: </span>
              {preview.safety.crisisShown ? t("pdf.yes") : t("pdf.no")}
            </p>
          </div>
        ) : null}

        <div className="rounded-lg border border-ink p-3 text-sm" data-testid="report-disclaimer">
          <p className="font-semibold">{t("pdf.disclaimerTitle")}</p>
          <p>{t("pdf.disclaimer")}</p>
        </div>

        <p className="flex gap-2 text-sm text-muted-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
          <span>{t("previewNote", { country: countries(country) })}</span>
        </p>
      </section>

      <div className="space-y-3">
        <Button
          type="button"
          size="lg"
          data-testid="download-pdf"
          disabled={status.kind === "working"}
          onClick={download}
          className="w-full sm:w-auto"
        >
          <Download aria-hidden="true" />
          {status.kind === "working" ? t("downloading") : t("download")}
        </Button>
        <p role="status" aria-live="polite" data-testid="report-status" className="text-sm">
          {status.kind === "done"
            ? t("downloaded", { fileName: status.fileName, code: status.code })
            : status.kind === "error"
              ? t("error")
              : null}
        </p>
      </div>

      <Button asChild variant="outline">
        <Link href={PATHS.hasil}>
          <ArrowLeft aria-hidden="true" />
          {all("common.backToResults")}
        </Link>
      </Button>
    </div>
  );
}

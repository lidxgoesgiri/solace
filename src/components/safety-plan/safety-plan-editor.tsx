"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { useOpenAccount } from "@/components/account/use-account";
import { SECTION_TITLE_KEYS } from "@/components/safety-plan/sections";
import { useSelectedCountry } from "@/components/help-directory";
import { Download } from "@/components/icons/download";
import { LifeBuoy } from "@/components/icons/life-buoy";
import { Lock } from "@/components/icons/lock";
import { Save } from "@/components/icons/save";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { loadRecords, saveRecord } from "@/lib/account/client";
import {
  SAFETY_PLAN_SECTIONS,
  type SafetyPlanRecord,
  type SafetyPlanSection,
  type StoredRecord,
} from "@/lib/account/types";
import { isLocale, servicesFor } from "@/lib/content";
import { PATHS } from "@/lib/flow";
import { loadRendererOnIntent, preloadReportRenderer, renderSafetyPlan, saveFile, scheduleReportRenderer } from "@/lib/report/client";
import { useAccountRecords } from "@/store/account-store";
import { useFlowDispatch } from "@/store/flow-store";

const EMPTY = Object.fromEntries(SAFETY_PLAN_SECTIONS.map((section) => [section, ""])) as Record<
  SafetyPlanSection,
  string
>;

type Status =
  | { kind: "idle" }
  | { kind: "busy"; action: "save" | "download" }
  | { kind: "saved" }
  | { kind: "downloaded"; fileName: string }
  | { kind: "error"; action: "save" | "download" };

/**
 * The six-part safety plan (SP-01). Signed in, it is saved encrypted in the
 * account; otherwise it stays in this page's memory only and can be
 * downloaded as a PDF (SP-03). Nothing is ever sent in the clear.
 */
export function SafetyPlanEditor({ accountsAvailable }: { accountsAvailable: boolean }) {
  const t = useTranslations("plan");
  const crisis = useTranslations("crisis");
  const all = useTranslations();
  const appLocale = useLocale();
  const locale = isLocale(appLocale) ? appLocale : "id";
  const username = useOpenAccount();
  const records = useAccountRecords();
  const country = useSelectedCountry();
  const pathname = usePathname();
  const dispatch = useFlowDispatch();
  const formId = useId();

  const [sections, setSections] = useState<Record<SafetyPlanSection, string>>(EMPTY);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const prefilled = useRef(false);

  const saved = records?.find(
    (record): record is StoredRecord<"safety_plan"> => record.kind === "safety_plan",
  );

  useEffect(() => {
    if (username) void loadRecords().catch(() => undefined);
  }, [username]);

  // The PDF engine arrives while the plan is being written, not on download.
  const [engineReady, setEngineReady] = useState(false);
  useEffect(() => scheduleReportRenderer(() => setEngineReady(true)), []);

  useEffect(() => {
    if (saved && !prefilled.current) {
      prefilled.current = true;
      setSections({ ...EMPTY, ...saved.value.sections });
    }
  }, [saved]);

  const loading = username !== null && records === null;
  const busy = status.kind === "busy";

  const save = async () => {
    setStatus({ kind: "busy", action: "save" });
    const value: SafetyPlanRecord = { v: 1, sections, updatedAt: new Date().toISOString() };
    try {
      await saveRecord("safety_plan", value, saved?.id);
      setStatus({ kind: "saved" });
    } catch {
      setStatus({ kind: "error", action: "save" });
    }
  };

  const download = async () => {
    setStatus({ kind: "busy", action: "download" });
    const now = new Date();
    const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
    const date = now.toISOString().slice(0, 10);
    try {
      const { bytes } = await renderSafetyPlan(
        {
          locale,
          sections: SAFETY_PLAN_SECTIONS.map((section) => ({
            title: crisis(SECTION_TITLE_KEYS[section] as "planCoping"),
            text: sections[section],
          })),
          services: [...servicesFor(country, "emergency"), ...servicesFor(country, "support")],
        },
        {
          docTitle: t("pdf.docTitle"),
          intro: t("pdf.intro"),
          madeOn: t("pdf.madeOn", { date: dateFormat.format(now) }),
          empty: t("pdf.empty"),
          disclaimer: t("pdf.disclaimer"),
          footer: t("pdf.footer"),
          page: (page, total) => t("pdf.page", { page, total }),
          directoryTitle: all("report.pdf.directoryTitle"),
          directoryCountry: all(`countries.${country}`),
          emergency: all("directory.emergency"),
          support: all("directory.support"),
          call: (label) => all("directory.call", { label }),
          source: all("report.pdf.source"),
          verifiedAt: (value) => all("directory.verifiedAt", { date: value }),
          notVerified: all("report.pdf.notVerified"),
          serviceType: {
            public: all("directory.type.public"),
            government: all("directory.type.government"),
            nonprofit: all("directory.type.nonprofit"),
          },
          formatDate: (iso) => dateFormat.format(new Date(iso)),
        },
      );
      const fileName = t("pdf.fileName", { date });
      saveFile(bytes, fileName);
      setStatus({ kind: "downloaded", fileName });
    } catch {
      setStatus({ kind: "error", action: "download" });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10" data-testid="safety-plan">
      <header className="space-y-4">
        <h1 className="text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
        <p className="measure text-lg leading-relaxed">{t("intro")}</p>
        {username ? (
          <p
            className="flex items-start gap-2.5 text-sm text-muted-foreground"
            data-testid="plan-in-account"
          >
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
            {t("savedInAccount")}
          </p>
        ) : (
          <div
            className="space-y-2 rounded-2xl border border-sun-edge/60 bg-sun-soft p-4 text-sm"
            data-testid="plan-local-only"
          >
            <p>{t("localOnly")}</p>
            {accountsAvailable ? (
              <Link
                href={`${PATHS.masuk}`}
                className="font-medium text-primary underline underline-offset-4"
              >
                {t("localSignIn")}
              </Link>
            ) : null}
          </div>
        )}
      </header>

      {loading ? (
        <p role="status" className="text-muted-foreground">
          {t("loading")}
        </p>
      ) : (
        <form
          id={formId}
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (username) void save();
          }}
        >
          {SAFETY_PLAN_SECTIONS.map((section, index) => {
            const id = `${formId}-${section}`;
            return (
              <div key={section} className="surface space-y-2 p-5 sm:p-6">
                <label htmlFor={id} className="flex items-baseline gap-3 font-heading text-xl">
                  <span aria-hidden="true" className="numeral text-sage-ink">
                    {index + 1}
                  </span>
                  {crisis(SECTION_TITLE_KEYS[section] as "planCoping")}
                </label>
                <p id={`${id}-hint`} className="text-sm text-muted-foreground">
                  {t(`hint.${section}`)}
                </p>
                <textarea
                  id={id}
                  rows={3}
                  maxLength={2000}
                  value={sections[section]}
                  onChange={(event) =>
                    setSections((current) => ({ ...current, [section]: event.target.value }))
                  }
                  aria-describedby={`${id}-hint`}
                  data-testid={`plan-${section}`}
                  className="block w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base leading-relaxed transition-colors hover:border-ink/60"
                />
              </div>
            );
          })}

          <div className="flex flex-wrap gap-3">
            {username ? (
              <Button type="submit" size="lg" disabled={busy} data-testid="plan-save">
                <Save aria-hidden="true" />
                {status.kind === "busy" && status.action === "save" ? t("saving") : t("save")}
              </Button>
            ) : null}
            <Button
              type="button"
              size="lg"
              variant={username ? "outline" : "default"}
              disabled={busy}
              aria-disabled={!engineReady || undefined}
              onClick={() => (engineReady ? download() : void preloadReportRenderer().catch(() => {}))}
              data-testid="plan-download"
              className="aria-disabled:cursor-progress aria-disabled:opacity-60"
              {...loadRendererOnIntent}
            >
              <Download aria-hidden="true" />
              {status.kind === "busy" && status.action === "download"
                ? t("downloading")
                : engineReady
                  ? t("download")
                  : t("preparing")}
            </Button>
          </div>
          <p role="status" aria-live="polite" className="min-h-6 text-sm" data-testid="plan-status">
            {status.kind === "saved"
              ? t("saved")
              : status.kind === "downloaded"
                ? t("downloaded", { fileName: status.fileName })
                : status.kind === "error"
                  ? status.action === "save"
                    ? t("saveError")
                    : t("downloadError")
                  : null}
          </p>
        </form>
      )}

      <section aria-labelledby="plan-help" className="space-y-3 border-t pt-8">
        <h2 id="plan-help" className="text-2xl">
          {t("helpTitle")}
        </h2>
        <Button asChild variant="warm">
          <Link
            href={PATHS.krisis}
            data-testid="plan-help-now"
            onClick={() => dispatch({ type: "REQUEST_HELP", from: pathname })}
          >
            <LifeBuoy aria-hidden="true" />
            {t("helpLink")}
          </Link>
        </Button>
      </section>
    </div>
  );
}

import { CalendarClock } from "@/components/icons/calendar-clock";
import { ClipboardList } from "@/components/icons/clipboard-list";
import { Save } from "@/components/icons/save";
import { ShieldCheck } from "@/components/icons/shield-check";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { StartForm } from "@/components/start-form";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "start" });
  return { title: t("title") };
}

export default async function StartPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  const t = await getTranslations("start");

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="max-w-3xl space-y-4">
        <h1 className="text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
        <p className="text-lg leading-relaxed">{t("intro")}</p>
        <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <Save aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
          {t("autosave")}
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[0.68fr_1fr] lg:items-start">
        <aside className="rounded-[1.5rem] bg-[#18333b] p-6 text-[#f3f6f3] sm:p-8" aria-labelledby="expect-title">
          <h2 id="expect-title" className="text-2xl">{t("expectTitle")}</h2>
          <ul className="mt-7 space-y-6 text-sm leading-relaxed text-[#d7e2df]">
            <li className="flex gap-3">
              <ClipboardList aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#b8d0c0]" />
              {t("expectItems")}
            </li>
            <li className="flex gap-3">
              <CalendarClock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#b8d0c0]" />
              {t("expectPeriod")}
            </li>
            <li className="flex gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#b8d0c0]" />
              {t("expectSafety")}
            </li>
          </ul>
        </aside>
        <section className="surface p-5 sm:p-8" aria-label={t("ageLegend")}>
          <StartForm />
        </section>
      </div>
    </div>
  );
}

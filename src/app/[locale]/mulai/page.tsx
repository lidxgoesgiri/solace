import { Save } from "lucide-react";
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
    <div className="mx-auto max-w-2xl space-y-10">
      <header className="space-y-4">
        <h1 className="text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
        <p className="text-lg leading-relaxed">{t("intro")}</p>
        <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <Save aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sage-ink" />
          {t("autosave")}
        </p>
      </header>
      <StartForm />
    </div>
  );
}

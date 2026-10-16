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
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl sm:text-4xl">{t("title")}</h1>
        <p className="text-base">{t("intro")}</p>
        <p className="text-sm text-muted-foreground">{t("autosave")}</p>
      </header>
      <StartForm />
    </div>
  );
}

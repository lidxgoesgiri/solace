import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { ResultsView } from "@/components/results-view";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "results" });
  return { title: t("title") };
}

export default async function ResultsPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  return <ResultsView />;
}

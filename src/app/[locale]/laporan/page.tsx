import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { ReportBuilder } from "@/components/report-builder";
import { aiClientInfo } from "@/server/ai";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "report" });
  return { title: t("title") };
}

export default async function ReportPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  // Whether the AI step is switched on, and its model; never the key.
  return <ReportBuilder ai={aiClientInfo()} />;
}

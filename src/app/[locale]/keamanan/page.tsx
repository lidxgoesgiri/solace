import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { SafetyQuestion } from "@/components/safety-question";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "safety" });
  return { title: t("title") };
}

export default async function SafetyPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  return <SafetyQuestion />;
}

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { ComingSoon } from "@/components/coming-soon";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "comingSoon" });
  return { title: t("tipsTitle") };
}

export default async function TipsPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  const t = await getTranslations("comingSoon");
  return <ComingSoon title={t("tipsTitle")} body={t("tipsBody")} testId="tips-coming-soon" />;
}

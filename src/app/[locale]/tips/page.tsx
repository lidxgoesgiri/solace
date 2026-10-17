import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { ComingSoon } from "@/components/coming-soon";
import { TipsView } from "@/components/tips/tips-view";
import { accountsEnabled } from "@/server/db";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "tips" });
  return { title: t("title") };
}

/**
 * Tips need an account (PRD 7). Until accounts have storage, the page keeps
 * saying so honestly instead of showing a sign-in that cannot work.
 */
export default async function TipsPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  if (accountsEnabled()) return <TipsView />;
  const t = await getTranslations("comingSoon");
  return <ComingSoon title={t("tipsTitle")} body={t("tipsBody")} testId="tips-coming-soon" />;
}

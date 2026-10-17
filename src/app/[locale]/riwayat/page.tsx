import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeFromParams } from "@/i18n/locale";
import { AccountsUnavailable } from "@/components/account/accounts-unavailable";
import { HistoryView } from "@/components/history/history-view";
import { accountsEnabled } from "@/server/db";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = await getTranslations({ locale, namespace: "history" });
  return { title: t("title") };
}

/** History needs an account (PRD 7) and is behind the crisis gate (K3). */
export default async function HistoryPage({ params }: PageProps) {
  const locale = await localeFromParams(params);
  setRequestLocale(locale);
  return accountsEnabled() ? <HistoryView /> : <AccountsUnavailable />;
}
